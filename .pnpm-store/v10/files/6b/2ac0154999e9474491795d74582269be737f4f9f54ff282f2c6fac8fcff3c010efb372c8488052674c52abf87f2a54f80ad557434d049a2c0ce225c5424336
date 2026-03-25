'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');

const useData = (props, { expandedRowKeys, lastRenderedRowIndex, resetAfterIndex }) => {
  const depthMap = vue.ref({});
  const flattenedData = vue.computed(() => {
    const depths = {};
    const { data: data2, rowKey } = props;
    const _expandedRowKeys = vue.unref(expandedRowKeys);
    if (!_expandedRowKeys || !_expandedRowKeys.length)
      return data2;
    const array = [];
    const keysSet = /* @__PURE__ */ new Set();
    _expandedRowKeys.forEach((x) => keysSet.add(x));
    let copy = data2.slice();
    copy.forEach((x) => depths[x[rowKey]] = 0);
    while (copy.length > 0) {
      const item = copy.shift();
      array.push(item);
      if (keysSet.has(item[rowKey]) && Array.isArray(item.children) && item.children.length > 0) {
        copy = [...item.children, ...copy];
        item.children.forEach((child) => depths[child[rowKey]] = depths[item[rowKey]] + 1);
      }
    }
    depthMap.value = depths;
    return array;
  });
  const data = vue.computed(() => {
    const { data: data2, expandColumnKey } = props;
    return expandColumnKey ? vue.unref(flattenedData) : data2;
  });
  vue.watch(data, (val, prev) => {
    if (val !== prev) {
      lastRenderedRowIndex.value = -1;
      resetAfterIndex(0, true);
    }
  });
  return {
    data,
    depthMap
  };
};

exports.useData = useData;
//# sourceMappingURL=use-data.js.map
