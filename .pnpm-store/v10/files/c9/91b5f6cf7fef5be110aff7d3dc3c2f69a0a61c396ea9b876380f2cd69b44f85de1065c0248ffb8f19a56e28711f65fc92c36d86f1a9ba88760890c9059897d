'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');

function useNodeExpandEventBroadcast(props) {
  const parentNodeMap = vue.inject("TreeNodeMap", null);
  const currentNodeMap = {
    treeNodeExpand: (node) => {
      if (props.node !== node) {
        props.node.collapse();
      }
    },
    children: []
  };
  if (parentNodeMap) {
    parentNodeMap.children.push(currentNodeMap);
  }
  vue.provide("TreeNodeMap", currentNodeMap);
  return {
    broadcastExpanded: (node) => {
      if (!props.accordion)
        return;
      for (const childNode of currentNodeMap.children) {
        childNode.treeNodeExpand(node);
      }
    }
  };
}

exports.useNodeExpandEventBroadcast = useNodeExpandEventBroadcast;
//# sourceMappingURL=useNodeExpandEventBroadcast.js.map
