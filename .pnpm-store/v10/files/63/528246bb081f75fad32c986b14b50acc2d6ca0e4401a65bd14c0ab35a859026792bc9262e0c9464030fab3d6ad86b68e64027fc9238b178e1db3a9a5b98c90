'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../utils/index.js');
require('../../../../hooks/index.js');
var index = require('../../../../hooks/use-namespace/index.js');
var style = require('../../../../utils/dom/style.js');

const dragEventsKey = Symbol("dragEvents");
function useDragNodeHandler({ props, ctx, el$, dropIndicator$, store }) {
  const ns = index.useNamespace("tree");
  const dragState = vue.ref({
    showDropIndicator: false,
    draggingNode: null,
    dropNode: null,
    allowDrop: true,
    dropType: null
  });
  const treeNodeDragStart = ({ event, treeNode }) => {
    if (typeof props.allowDrag === "function" && !props.allowDrag(treeNode.node)) {
      event.preventDefault();
      return false;
    }
    event.dataTransfer.effectAllowed = "move";
    try {
      event.dataTransfer.setData("text/plain", "");
    } catch (e) {
    }
    dragState.value.draggingNode = treeNode;
    ctx.emit("node-drag-start", treeNode.node, event);
  };
  const treeNodeDragOver = ({ event, treeNode }) => {
    const dropNode = treeNode;
    const oldDropNode = dragState.value.dropNode;
    if (oldDropNode && oldDropNode.node.id !== dropNode.node.id) {
      style.removeClass(oldDropNode.$el, ns.is("drop-inner"));
    }
    const draggingNode = dragState.value.draggingNode;
    if (!draggingNode || !dropNode)
      return;
    let dropPrev = true;
    let dropInner = true;
    let dropNext = true;
    let userAllowDropInner = true;
    if (typeof props.allowDrop === "function") {
      dropPrev = props.allowDrop(draggingNode.node, dropNode.node, "prev");
      userAllowDropInner = dropInner = props.allowDrop(draggingNode.node, dropNode.node, "inner");
      dropNext = props.allowDrop(draggingNode.node, dropNode.node, "next");
    }
    event.dataTransfer.dropEffect = dropInner || dropPrev || dropNext ? "move" : "none";
    if ((dropPrev || dropInner || dropNext) && (oldDropNode == null ? void 0 : oldDropNode.node.id) !== dropNode.node.id) {
      if (oldDropNode) {
        ctx.emit("node-drag-leave", draggingNode.node, oldDropNode.node, event);
      }
      ctx.emit("node-drag-enter", draggingNode.node, dropNode.node, event);
    }
    if (dropPrev || dropInner || dropNext) {
      dragState.value.dropNode = dropNode;
    }
    if (dropNode.node.nextSibling === draggingNode.node) {
      dropNext = false;
    }
    if (dropNode.node.previousSibling === draggingNode.node) {
      dropPrev = false;
    }
    if (dropNode.node.contains(draggingNode.node, false)) {
      dropInner = false;
    }
    if (draggingNode.node === dropNode.node || draggingNode.node.contains(dropNode.node)) {
      dropPrev = false;
      dropInner = false;
      dropNext = false;
    }
    const targetPosition = dropNode.$el.querySelector(`.${ns.be("node", "content")}`).getBoundingClientRect();
    const treePosition = el$.value.getBoundingClientRect();
    let dropType;
    const prevPercent = dropPrev ? dropInner ? 0.25 : dropNext ? 0.45 : 1 : -1;
    const nextPercent = dropNext ? dropInner ? 0.75 : dropPrev ? 0.55 : 0 : 1;
    let indicatorTop = -9999;
    const distance = event.clientY - targetPosition.top;
    if (distance < targetPosition.height * prevPercent) {
      dropType = "before";
    } else if (distance > targetPosition.height * nextPercent) {
      dropType = "after";
    } else if (dropInner) {
      dropType = "inner";
    } else {
      dropType = "none";
    }
    const iconPosition = dropNode.$el.querySelector(`.${ns.be("node", "expand-icon")}`).getBoundingClientRect();
    const dropIndicator = dropIndicator$.value;
    if (dropType === "before") {
      indicatorTop = iconPosition.top - treePosition.top;
    } else if (dropType === "after") {
      indicatorTop = iconPosition.bottom - treePosition.top;
    }
    dropIndicator.style.top = `${indicatorTop}px`;
    dropIndicator.style.left = `${iconPosition.right - treePosition.left}px`;
    if (dropType === "inner") {
      style.addClass(dropNode.$el, ns.is("drop-inner"));
    } else {
      style.removeClass(dropNode.$el, ns.is("drop-inner"));
    }
    dragState.value.showDropIndicator = dropType === "before" || dropType === "after";
    dragState.value.allowDrop = dragState.value.showDropIndicator || userAllowDropInner;
    dragState.value.dropType = dropType;
    ctx.emit("node-drag-over", draggingNode.node, dropNode.node, event);
  };
  const treeNodeDragEnd = (event) => {
    const { draggingNode, dropType, dropNode } = dragState.value;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (draggingNode && dropNode) {
      const draggingNodeCopy = { data: draggingNode.node.data };
      if (dropType !== "none") {
        draggingNode.node.remove();
      }
      if (dropType === "before") {
        dropNode.node.parent.insertBefore(draggingNodeCopy, dropNode.node);
      } else if (dropType === "after") {
        dropNode.node.parent.insertAfter(draggingNodeCopy, dropNode.node);
      } else if (dropType === "inner") {
        dropNode.node.insertChild(draggingNodeCopy);
      }
      if (dropType !== "none") {
        store.value.registerNode(draggingNodeCopy);
      }
      style.removeClass(dropNode.$el, ns.is("drop-inner"));
      ctx.emit("node-drag-end", draggingNode.node, dropNode.node, dropType, event);
      if (dropType !== "none") {
        ctx.emit("node-drop", draggingNode.node, dropNode.node, dropType, event);
      }
    }
    if (draggingNode && !dropNode) {
      ctx.emit("node-drag-end", draggingNode.node, null, dropType, event);
    }
    dragState.value.showDropIndicator = false;
    dragState.value.draggingNode = null;
    dragState.value.dropNode = null;
    dragState.value.allowDrop = true;
  };
  vue.provide(dragEventsKey, {
    treeNodeDragStart,
    treeNodeDragOver,
    treeNodeDragEnd
  });
  return {
    dragState
  };
}

exports.dragEventsKey = dragEventsKey;
exports.useDragNodeHandler = useDragNodeHandler;
//# sourceMappingURL=useDragNode.js.map
