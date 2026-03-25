const NODE_KEY = "$treeNodeId";
const markNodeData = function(node, data) {
  if (!data || data[NODE_KEY])
    return;
  Object.defineProperty(data, NODE_KEY, {
    value: node.id,
    enumerable: false,
    configurable: false,
    writable: false
  });
};
const getNodeKey = function(key, data) {
  if (!key)
    return data[NODE_KEY];
  return data[key];
};
const handleCurrentChange = (store, emit, setCurrent) => {
  const preCurrentNode = store.value.currentNode;
  setCurrent();
  const currentNode = store.value.currentNode;
  if (preCurrentNode === currentNode)
    return;
  emit("current-change", currentNode ? currentNode.data : null, currentNode);
};

export { NODE_KEY, getNodeKey, handleCurrentChange, markNodeData };
//# sourceMappingURL=util.mjs.map
