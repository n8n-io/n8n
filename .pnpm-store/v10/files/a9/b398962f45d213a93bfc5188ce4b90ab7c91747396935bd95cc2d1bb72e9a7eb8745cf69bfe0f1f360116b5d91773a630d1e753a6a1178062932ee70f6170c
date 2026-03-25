import { ref, toRef, shallowRef, computed, unref, watch } from 'vue';
import '../../../utils/index.mjs';
import './composables/index.mjs';
import { useColumns } from './composables/use-columns.mjs';
import { useScrollbar } from './composables/use-scrollbar.mjs';
import { useRow } from './composables/use-row.mjs';
import { useData } from './composables/use-data.mjs';
import { useStyles } from './composables/use-styles.mjs';
import { isArray } from '@vue/shared';

function useTable(props) {
  const mainTableRef = ref();
  const leftTableRef = ref();
  const rightTableRef = ref();
  const {
    columns,
    columnsStyles,
    columnsTotalWidth,
    fixedColumnsOnLeft,
    fixedColumnsOnRight,
    hasFixedColumns,
    mainColumns,
    onColumnSorted
  } = useColumns(props, toRef(props, "columns"), toRef(props, "fixed"));
  const {
    scrollTo,
    scrollToLeft,
    scrollToTop,
    scrollToRow,
    onScroll,
    onVerticalScroll,
    scrollPos
  } = useScrollbar(props, {
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
  } = useRow(props, {
    mainTableRef,
    leftTableRef,
    rightTableRef
  });
  const { data, depthMap } = useData(props, {
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
  } = useStyles(props, {
    columnsTotalWidth,
    data,
    fixedColumnsOnLeft,
    fixedColumnsOnRight
  });
  const isScrolling = shallowRef(false);
  const containerRef = ref();
  const showEmpty = computed(() => {
    const noData = unref(data).length === 0;
    return isArray(props.fixedData) ? props.fixedData.length === 0 && noData : noData;
  });
  function getRowHeight(rowIndex) {
    const { estimatedRowHeight, rowHeight, rowKey } = props;
    if (!estimatedRowHeight)
      return rowHeight;
    return unref(rowHeights)[unref(data)[rowIndex][rowKey]] || estimatedRowHeight;
  }
  function onMaybeEndReached() {
    const { onEndReached } = props;
    if (!onEndReached)
      return;
    const { scrollTop } = unref(scrollPos);
    const _totalHeight = unref(rowsHeight);
    const clientHeight = unref(windowHeight);
    const heightUntilEnd = _totalHeight - (scrollTop + clientHeight) + props.hScrollbarSize;
    if (unref(lastRenderedRowIndex) >= 0 && _totalHeight === scrollTop + unref(mainTableHeight) - unref(headerHeight)) {
      onEndReached(heightUntilEnd);
    }
  }
  watch(() => props.expandedRowKeys, (val) => expandedRowKeys.value = val, {
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

export { useTable };
//# sourceMappingURL=use-table.mjs.map
