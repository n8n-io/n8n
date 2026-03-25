function isValidValue(val) {
  return val || val === 0;
}
function isValidArray(val) {
  return Array.isArray(val) && val.length;
}
function toValidArray(val) {
  return Array.isArray(val) ? val : isValidValue(val) ? [val] : [];
}
function treeFind(treeData, findCallback, getChildren, resultCallback, parent) {
  for (let i = 0; i < treeData.length; i++) {
    const data = treeData[i];
    if (findCallback(data, i, treeData, parent)) {
      return resultCallback ? resultCallback(data, i, treeData, parent) : data;
    } else {
      const children = getChildren(data);
      if (isValidArray(children)) {
        const find = treeFind(children, findCallback, getChildren, resultCallback, data);
        if (find)
          return find;
      }
    }
  }
}
function treeEach(treeData, callback, getChildren, parent) {
  for (let i = 0; i < treeData.length; i++) {
    const data = treeData[i];
    callback(data, i, treeData, parent);
    const children = getChildren(data);
    if (isValidArray(children)) {
      treeEach(children, callback, getChildren, data);
    }
  }
}

export { isValidArray, isValidValue, toValidArray, treeEach, treeFind };
//# sourceMappingURL=utils.mjs.map
