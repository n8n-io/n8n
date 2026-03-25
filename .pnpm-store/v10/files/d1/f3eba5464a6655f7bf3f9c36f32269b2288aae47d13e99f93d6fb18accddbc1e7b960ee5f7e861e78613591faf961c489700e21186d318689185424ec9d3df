import { getCurrentInstance, shallowRef, ref, computed, unref } from 'vue';
import { debounce } from 'lodash-unified';
import '../../../../utils/index.mjs';
import { FixedDir } from '../constants.mjs';
import { isNumber } from '../../../../utils/types.mjs';

const useRow = (props, { mainTableRef, leftTableRef, rightTableRef }) => {
  const vm = getCurrentInstance();
  const { emit } = vm;
  const isResetting = shallowRef(false);
  const hoveringRowKey = shallowRef(null);
  const expandedRowKeys = ref(props.defaultExpandedRowKeys || []);
  const lastRenderedRowIndex = ref(-1);
  const resetIndex = shallowRef(null);
  const rowHeights = ref({});
  const pendingRowHeights = ref({});
  const leftTableHeights = shallowRef({});
  const mainTableHeights = shallowRef({});
  const rightTableHeights = shallowRef({});
  const isDynamic = computed(() => isNumber(props.estimatedRowHeight));
  function onRowsRendered(params) {
    var _a;
    (_a = props.onRowsRendered) == null ? void 0 : _a.call(props, params);
    if (params.rowCacheEnd > unref(lastRenderedRowIndex)) {
      lastRenderedRowIndex.value = params.rowCacheEnd;
    }
  }
  function onRowHovered({ hovered, rowKey }) {
    hoveringRowKey.value = hovered ? rowKey : null;
  }
  function onRowExpanded({
    expanded,
    rowData,
    rowIndex,
    rowKey
  }) {
    var _a, _b;
    const _expandedRowKeys = [...unref(expandedRowKeys)];
    const currentKeyIndex = _expandedRowKeys.indexOf(rowKey);
    if (expanded) {
      if (currentKeyIndex === -1)
        _expandedRowKeys.push(rowKey);
    } else {
      if (currentKeyIndex > -1)
        _expandedRowKeys.splice(currentKeyIndex, 1);
    }
    expandedRowKeys.value = _expandedRowKeys;
    emit("update:expandedRowKeys", _expandedRowKeys);
    (_a = props.onRowExpand) == null ? void 0 : _a.call(props, {
      expanded,
      rowData,
      rowIndex,
      rowKey
    });
    (_b = props.onExpandedRowsChange) == null ? void 0 : _b.call(props, _expandedRowKeys);
  }
  const flushingRowHeights = debounce(() => {
    var _a, _b, _c, _d;
    isResetting.value = true;
    rowHeights.value = { ...unref(rowHeights), ...unref(pendingRowHeights) };
    resetAfterIndex(unref(resetIndex), false);
    pendingRowHeights.value = {};
    resetIndex.value = null;
    (_a = mainTableRef.value) == null ? void 0 : _a.forceUpdate();
    (_b = leftTableRef.value) == null ? void 0 : _b.forceUpdate();
    (_c = rightTableRef.value) == null ? void 0 : _c.forceUpdate();
    (_d = vm.proxy) == null ? void 0 : _d.$forceUpdate();
    isResetting.value = false;
  }, 0);
  function resetAfterIndex(index, forceUpdate = false) {
    if (!unref(isDynamic))
      return;
    [mainTableRef, leftTableRef, rightTableRef].forEach((tableRef) => {
      const table = unref(tableRef);
      if (table)
        table.resetAfterRowIndex(index, forceUpdate);
    });
  }
  function resetHeights(rowKey, height, rowIdx) {
    const resetIdx = unref(resetIndex);
    if (resetIdx === null) {
      resetIndex.value = rowIdx;
    } else {
      if (resetIdx > rowIdx) {
        resetIndex.value = rowIdx;
      }
    }
    pendingRowHeights.value[rowKey] = height;
  }
  function onRowHeightChange({ rowKey, height, rowIndex }, fixedDir) {
    if (!fixedDir) {
      mainTableHeights.value[rowKey] = height;
    } else {
      if (fixedDir === FixedDir.RIGHT) {
        rightTableHeights.value[rowKey] = height;
      } else {
        leftTableHeights.value[rowKey] = height;
      }
    }
    const maximumHeight = Math.max(...[leftTableHeights, rightTableHeights, mainTableHeights].map((records) => records.value[rowKey] || 0));
    if (unref(rowHeights)[rowKey] !== maximumHeight) {
      resetHeights(rowKey, maximumHeight, rowIndex);
      flushingRowHeights();
    }
  }
  return {
    hoveringRowKey,
    expandedRowKeys,
    lastRenderedRowIndex,
    isDynamic,
    isResetting,
    rowHeights,
    resetAfterIndex,
    onRowExpanded,
    onRowHovered,
    onRowsRendered,
    onRowHeightChange
  };
};

export { useRow };
//# sourceMappingURL=use-row.mjs.map
