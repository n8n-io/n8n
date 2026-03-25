'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var lodashUnified = require('lodash-unified');
require('../../../../utils/index.js');
var constants = require('../constants.js');
var types = require('../../../../utils/types.js');

const useRow = (props, { mainTableRef, leftTableRef, rightTableRef }) => {
  const vm = vue.getCurrentInstance();
  const { emit } = vm;
  const isResetting = vue.shallowRef(false);
  const hoveringRowKey = vue.shallowRef(null);
  const expandedRowKeys = vue.ref(props.defaultExpandedRowKeys || []);
  const lastRenderedRowIndex = vue.ref(-1);
  const resetIndex = vue.shallowRef(null);
  const rowHeights = vue.ref({});
  const pendingRowHeights = vue.ref({});
  const leftTableHeights = vue.shallowRef({});
  const mainTableHeights = vue.shallowRef({});
  const rightTableHeights = vue.shallowRef({});
  const isDynamic = vue.computed(() => types.isNumber(props.estimatedRowHeight));
  function onRowsRendered(params) {
    var _a;
    (_a = props.onRowsRendered) == null ? void 0 : _a.call(props, params);
    if (params.rowCacheEnd > vue.unref(lastRenderedRowIndex)) {
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
    const _expandedRowKeys = [...vue.unref(expandedRowKeys)];
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
  const flushingRowHeights = lodashUnified.debounce(() => {
    var _a, _b, _c, _d;
    isResetting.value = true;
    rowHeights.value = { ...vue.unref(rowHeights), ...vue.unref(pendingRowHeights) };
    resetAfterIndex(vue.unref(resetIndex), false);
    pendingRowHeights.value = {};
    resetIndex.value = null;
    (_a = mainTableRef.value) == null ? void 0 : _a.forceUpdate();
    (_b = leftTableRef.value) == null ? void 0 : _b.forceUpdate();
    (_c = rightTableRef.value) == null ? void 0 : _c.forceUpdate();
    (_d = vm.proxy) == null ? void 0 : _d.$forceUpdate();
    isResetting.value = false;
  }, 0);
  function resetAfterIndex(index, forceUpdate = false) {
    if (!vue.unref(isDynamic))
      return;
    [mainTableRef, leftTableRef, rightTableRef].forEach((tableRef) => {
      const table = vue.unref(tableRef);
      if (table)
        table.resetAfterRowIndex(index, forceUpdate);
    });
  }
  function resetHeights(rowKey, height, rowIdx) {
    const resetIdx = vue.unref(resetIndex);
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
      if (fixedDir === constants.FixedDir.RIGHT) {
        rightTableHeights.value[rowKey] = height;
      } else {
        leftTableHeights.value[rowKey] = height;
      }
    }
    const maximumHeight = Math.max(...[leftTableHeights, rightTableHeights, mainTableHeights].map((records) => records.value[rowKey] || 0));
    if (vue.unref(rowHeights)[rowKey] !== maximumHeight) {
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

exports.useRow = useRow;
//# sourceMappingURL=use-row.js.map
