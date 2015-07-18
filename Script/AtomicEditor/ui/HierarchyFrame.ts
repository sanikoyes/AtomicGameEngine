
import HierarchyFrameMenu = require("./HierarchyFrameMenu");
import MenuItemSources = require("./menus/MenuItemSources");

class HierarchyFrame extends Atomic.UIWidget {

    scene: Atomic.Scene = null;
    hierList: Atomic.UIListView;
    menu: HierarchyFrameMenu;
    nodeIDToItemID = {};

    constructor(parent: Atomic.UIWidget) {

        super();

        this.menu = new HierarchyFrameMenu();

        this.load("AtomicEditor/editor/ui/hierarchyframe.tb.txt");

        this.gravity = Atomic.UI_GRAVITY_TOP_BOTTOM;

        var hierarchycontainer = parent.getWidget("hierarchycontainer");
        hierarchycontainer.addChild(this);

        hierarchycontainer = this.getWidget("hierarchycontainer");

        var hierList = this.hierList = new Atomic.UIListView();

        hierList.rootList.id = "hierList_";

        hierarchycontainer.addChild(hierList);

        this.subscribeToEvent(this, "WidgetEvent", (data) => this.handleWidgetEvent(data));

        this.subscribeToEvent("EditorActiveSceneChanged", (data) => this.handleActiveSceneChanged(data));

        this.subscribeToEvent("EditorActiveNodeChange", (data) => {

            if (data.node)
                this.hierList.selectItemByID(data.node.id.toString());

        });

    }

    handleNodeAdded(ev: Atomic.NodeAddedEvent) {

        var node = ev.node;

        if (!node.parent || node.scene != this.scene)
            return;

        var parentID = this.nodeIDToItemID[node.parent.id];

        var childItemID = this.hierList.addChildItem(parentID, node.name, "Folder.icon", node.id.toString());

        this.nodeIDToItemID[node.id] = childItemID;

    }

    handleNodeRemoved(ev: Atomic.NodeRemovedEvent) {

        console.log("handle Node Removed");

        var node = ev.node;

        delete this.nodeIDToItemID[node.id];

        if (!node.parent || node.scene != this.scene)
            return;

        this.hierList.deleteItemByID(node.id.toString());

        this.sendEvent("EditorActiveNodeChange", { node: ev.parent ? ev.parent : this.scene});

    }

    handleActiveSceneChanged(data) {

        if (this.scene)
            this.unsubscribeFromEvents(this.scene);

        this.scene = <Atomic.Scene> data.scene;

        this.populate();

        if (this.scene) {

            this.subscribeToEvent(this.scene, "NodeAdded", (ev: Atomic.NodeAddedEvent) => this.handleNodeAdded(ev));
            this.subscribeToEvent(this.scene, "NodeRemoved", (ev: Atomic.NodeRemovedEvent) => this.handleNodeRemoved(ev));
            this.subscribeToEvent(this.scene, "NodeNameChanged", (ev: Atomic.NodeNameChangedEvent) => {

                this.hierList.setItemText(ev.node.id.toString(), ev.node.name);

            });

        }

    }

    handleWidgetEvent(data: Atomic.UIWidgetEvent): boolean {

        if (data.type == Atomic.UI_EVENT_TYPE_CLICK) {

            var id = data.target.id;

            if (this.menu.handlePopupMenu(data.target, data.refid))
                return true;

            if (id == "create popup") {

                if (data.refid == "create_node") {

                    var selectedId = Number(this.hierList.rootList.selectedItemID);
                    var node = this.scene.getNode(selectedId);
                    node.createChild("Node");

                }

            }

            // create
            if (id == "menu create") {

                var src = MenuItemSources.getMenuItemSource("hierarchy create items");
                var menu = new Atomic.UIMenuWindow(data.target, "create popup");
                menu.show(src);
                return true;

            }


            if (id == "hierList_") {

                var list = <Atomic.UISelectList> data.target;

                var selectedId = Number(list.selectedItemID);
                var node = this.scene.getNode(selectedId);
                this.hierList.rootList.dragObject = new Atomic.UIDragObject(node, node.name.length ? node.name : "(Anonymous)");
                this.sendEvent("EditorActiveNodeChange", { node: node });
                return false;

            }
        }

        return false;
    }

    recursiveAddNode(parentID: number, node: Atomic.Node) {

        //if (node.isTemporary())
        //  return;

        var name = node.name;

        if (!name.length)
            name = "(Anonymous)"

        var childItemID = this.hierList.addChildItem(parentID, name, "Folder.icon", node.id.toString());

        this.nodeIDToItemID[node.id] = childItemID;

        for (var i = 0; i < node.getNumChildren(false); i++) {

            this.recursiveAddNode(childItemID, node.getChildAtIndex(i));

        }

    }

    populate() {

        this.nodeIDToItemID = {};
        this.hierList.deleteAllItems();

        if (!this.scene)
            return;

        var parentID = this.hierList.addRootItem("Scene", "Folder.icon", this.scene.id.toString());

        this.nodeIDToItemID[this.scene.id] = parentID;

        for (var i = 0; i < this.scene.getNumChildren(false); i++) {

            this.recursiveAddNode(parentID, this.scene.getChildAtIndex(i));

        }

        this.hierList.rootList.value = 0;
        this.hierList.setExpanded(parentID, true);

    }

}

export = HierarchyFrame;
