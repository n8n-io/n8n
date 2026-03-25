import { ref, computed, unref, watch } from 'vue';

const useData = (props, { expandedRowKeys, lastRenderedRowIndex, resetAfterIndex }) => {
  const depthMap = ref({});
  const flattenedData = computed(() => {
    const depths = {};
    const { data: data2, rowKey } = props;
    const _expandedRowKeys = unref(expandedRowKeys);
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
  const data = computed(() => {
    const { data: data2, expandColumnKey } = props;
    return expandColumnKey ? unref(flattenedData) : data2;
  });
  watch(data, (val, prev) => {
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

export { useData };
//# sourceMappingURL=use-data.mjs.map
