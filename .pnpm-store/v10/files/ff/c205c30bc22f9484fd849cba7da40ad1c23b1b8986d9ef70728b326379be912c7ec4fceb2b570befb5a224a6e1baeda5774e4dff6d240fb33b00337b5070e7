'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../utils/index.js');
require('./composables/index.js');
var useColumns = require('./composables/use-columns.js');
var useScrollbar = require('./composables/use-scrollbar.js');
var useRow = require('./composables/use-row.js');
var useData = require('./composables/use-data.js');
var useStyles = require('./composables/use-styles.js');
var shared = require('@vue/shared');

function useTable(props) {
  const mainTableRef = vue.ref();
  const leftTableRef = vue.ref();
  const rightTableRef = vue.ref();
  const {
    columns,
    columnsStyles,
    columnsTotalWidth,
    fixedColumnsOnLeft,
    fixedColumnsOnRight,
    hasFixedColumns,
    mainColumns,
    onColumnSorted
  } = useColumns.useColumns(props, vue.toRef(props, "columns"), vue.toRef(props, "fixed"));
  const {
    scrollTo,
    scrollToLeft,
    scrollToTop,
    scrollToRow,
    onScroll,
    onVerticalScroll,
    scrollPos
  } = useScrollbar.useScrollbar(props, {
    mainTableRef,
    leftTableRef,
    rightTableRef,
    onMaybeEndReached
  });
  const {
    expandedRowKeys,
    hoveringRowKey,
    lastRenderedRowIndex,
    isDynamic,
    isResetting,
    rowHeights,
    resetAfterIndex,
    onRowExpanded,
    onRowHeightChange,
    onRowHovered,
    onRowsRendered
  } = useRow.useRow(props, {
    mainTableRef,
    leftTableRef,
    rightTableRef
  });
  const { data, depthMap } = useData.useData(props, {
    expandedRowKeys,
    lastRenderedRowIndex,
    resetAfterIndex
  });
  const {
    bodyWidth,
    fixedTableHeight,
    mainTableHeight,
    leftTableWidth,
    rightTableWidth,
    headerWidth,
    rowsHeight,
    windowHeight,
    footerHeight,
    emptyStyle,
    rootStyle,
    headerHeight
  } = useStyles.useStyles(props, {
    columnsTotalWidth,
    data,
    fixedColumnsOnLeft,
    fixedColumnsOnRight
  });
  const isScrolling = vue.shallowRef(false);
  const containerRef = vue.ref();
  const showEmpty = vue.computed(() => {
    const noData = vue.unref(data).length === 0;
    return shared.isArray(props.fixedData) ? props.fixedData.length === 0 && noData : noData;
  });
  function getRowHeight(rowIndex) {
    const { estimatedRowHeight, rowHeight, rowKey } = props;
    if (!estimatedRowHeight)
      return rowHeight;
    return vue.unref(rowHeights)[vue.unref(data)[rowIndex][rowKey]] || estimatedRowHeight;
  }
  function onMaybeEndReached() {
    const { onEndReached } = props;
    if (!onEndReached)
      return;
    const { scrollTop } = vue.unref(scrollPos);
    const _totalHeight = vue.unref(rowsHeight);
    const clientHeight = vue.unref(windowHeight);
    const heightUntilEnd = _totalHeight - (scrollTop + clientHeight) + props.hScrollbarSize;
    if (vue.unref(lastRenderedRowIndex) >= 0 && _totalHeight === scrollTop + vue.unref(mainTableHeight) - vue.unref(headerHeight)) {
      onEndReached(heightUntilEnd);
    }
  }
  vue.watch(() => props.expandedRowKeys, (val) => expandedRowKeys.value = val, {
    deep: true
  });
  return {
    columns,
    containerRef,
    mainTableRef,
    leftTableRef,
    rightTableRef,
    isDynamic,
    isResetting,
    isScrolling,
    hoveringRowKey,
    hasFixedColumns,
    columnsStyles,
    columnsTotalWidth,
    data,
    expandedRowKeys,
    depthMap,
    fixedColumnsOnLeft,
    fixedColumnsOnRight,
    mainColumns,
    bodyWidth,
    emptyStyle,
    rootStyle,
    headerWidth,
    footerHeight,
    mainTableHeight,
    fixedTableHeight,
    leftTableWidth,
    rightTableWidth,
    showEmpty,
    getRowHeight,
    onColumnSorted,
    onRowHovered,
    onRowExpanded,
    onRowsRendered,
    onRowHeightChange,
    scrollTo,
    scrollToLeft,
    scrollToTop,
    scrollToRow,
    onScroll,
    onVerticalScroll
  };
}

exports.useTable = useTable;
//# sourceMappingURL=use-table.js.map
