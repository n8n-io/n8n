import { ref, computed, unref, defineComponent, inject, createVNode } from 'vue';
import '../../virtual-list/index.mjs';
import '../../../utils/index.mjs';
import './components/index.mjs';
import { TableV2InjectionKey } from './tokens.mjs';
import { tableV2GridProps } from './grid.mjs';
import { sum } from './utils.mjs';
import { isObject } from '@vue/shared';
import { isNumber } from '../../../utils/types.mjs';
import DynamicSizeGrid from '../../virtual-list/src/components/dynamic-size-grid.mjs';
import FixedSizeGrid from '../../virtual-list/src/components/fixed-size-grid.mjs';
import TableV2Header from './components/header.mjs';

const COMPONENT_NAME = "ElTableV2Grid";
const useTableGrid = (props) => {
  const headerRef = ref();
  const bodyRef = ref();
  const totalHeight = computed(() => {
    const {
      data,
      rowHeight,
      estimatedRowHeight
    } = props;
    if (estimatedRowHeight) {
      return;
    }
    return data.length * rowHeight;
  });
  const fixedRowHeight = computed(() => {
    const {
      fixedData,
      rowHeight
    } = props;
    return ((fixedData == null ? void 0 : fixedData.length) || 0) * rowHeight;
  });
  const headerHeight = computed(() => sum(props.headerHeight));
  const gridHeight = computed(() => {
    const {
      height
    } = props;
    return Math.max(0, height - unref(headerHeight) - unref(fixedRowHeight));
  });
  const hasHeader = computed(() => {
    return unref(headerHeight) + unref(fixedRowHeight) > 0;
  });
  const itemKey = ({
    data,
    rowIndex
  }) => data[rowIndex][props.rowKey];
  function onItemRendered({
    rowCacheStart,
    rowCacheEnd,
    rowVisibleStart,
    rowVisibleEnd
  }) {
    var _a;
    (_a = props.onRowsRendered) == null ? void 0 : _a.call(props, {
      rowCacheStart,
      rowCacheEnd,
      rowVisibleStart,
      rowVisibleEnd
    });
  }
  function resetAfterRowIndex(index, forceUpdate2) {
    var _a;
    (_a = bodyRef.value) == null ? void 0 : _a.resetAfterRowIndex(index, forceUpdate2);
  }
  function scrollTo(leftOrOptions, top) {
    const header$ = unref(headerRef);
    const body$ = unref(bodyRef);
    if (!header$ || !body$)
      return;
    if (isObject(leftOrOptions)) {
      header$.scrollToLeft(leftOrOptions.scrollLeft);
      body$.scrollTo(leftOrOptions);
    } else {
      header$.scrollToLeft(leftOrOptions);
      body$.scrollTo({
        scrollLeft: leftOrOptions,
        scrollTop: top
      });
    }
  }
  function scrollToTop(scrollTop) {
    var _a;
    (_a = unref(bodyRef)) == null ? void 0 : _a.scrollTo({
      scrollTop
    });
  }
  function scrollToRow(row, strategy) {
    var _a;
    (_a = unref(bodyRef)) == null ? void 0 : _a.scrollToItem(row, 1, strategy);
  }
  function forceUpdate() {
    var _a, _b;
    (_a = unref(bodyRef)) == null ? void 0 : _a.$forceUpdate();
    (_b = unref(headerRef)) == null ? void 0 : _b.$forceUpdate();
  }
  return {
    bodyRef,
    forceUpdate,
    fixedRowHeight,
    gridHeight,
    hasHeader,
    headerHeight,
    headerRef,
    totalHeight,
    itemKey,
    onItemRendered,
    resetAfterRowIndex,
    scrollTo,
    scrollToTop,
    scrollToRow
  };
};
const TableGrid = defineComponent({
  name: COMPONENT_NAME,
  props: tableV2GridProps,
  setup(props, {
    slots,
    expose
  }) {
    const {
      ns
    } = inject(TableV2InjectionKey);
    const {
      bodyRef,
      fixedRowHeight,
      gridHeight,
      hasHeader,
      headerRef,
      headerHeight,
      totalHeight,
      forceUpdate,
      itemKey,
      onItemRendered,
      resetAfterRowIndex,
      scrollTo,
      scrollToTop,
      scrollToRow
    } = useTableGrid(props);
    expose({
      forceUpdate,
      totalHeight,
      scrollTo,
      scrollToTop,
      scrollToRow,
      resetAfterRowIndex
    });
    const getColumnWidth = () => props.bodyWidth;
    return () => {
      const {
        cache,
        columns,
        data,
        fixedData,
        useIsScrolling,
        scrollbarAlwaysOn,
        scrollbarEndGap,
        scrollbarStartGap,
        style,
        rowHeight,
        bodyWidth,
        estimatedRowHeight,
        headerWidth,
        height,
        width,
        getRowHeight,
        onScroll
      } = props;
      const isDynamicRowEnabled = isNumber(estimatedRowHeight);
      const Grid = isDynamicRowEnabled ? DynamicSizeGrid : FixedSizeGrid;
      const _headerHeight = unref(headerHeight);
      return createVNode("div", {
        "role": "table",
        "class": [ns.e("table"), props.class],
        "style": style
      }, [createVNode(Grid, {
        "ref": bodyRef,
        "data": data,
        "useIsScrolling": useIsScrolling,
        "itemKey": itemKey,
        "columnCache": 0,
        "columnWidth": isDynamicRowEnabled ? getColumnWidth : bodyWidth,
        "totalColumn": 1,
        "totalRow": data.length,
        "rowCache": cache,
        "rowHeight": isDynamicRowEnabled ? getRowHeight : rowHeight,
        "width": width,
        "height": unref(gridHeight),
        "class": ns.e("body"),
        "role": "rowgroup",
        "scrollbarStartGap": scrollbarStartGap,
        "scrollbarEndGap": scrollbarEndGap,
        "scrollbarAlwaysOn": scrollbarAlwaysOn,
        "onScroll": onScroll,
        "onItemRendered": onItemRendered,
        "perfMode": false
      }, {
        default: (params) => {
          var _a;
          const rowData = data[params.rowIndex];
          return (_a = slots.row) == null ? void 0 : _a.call(slots, {
            ...params,
            columns,
            rowData
          });
        }
      }), unref(hasHeader) && createVNode(TableV2Header, {
        "ref": headerRef,
        "class": ns.e("header-wrapper"),
        "columns": columns,
        "headerData": data,
        "headerHeight": props.headerHeight,
        "fixedHeaderData": fixedData,
        "rowWidth": headerWidth,
        "rowHeight": rowHeight,
        "width": width,
        "height": Math.min(_headerHeight + unref(fixedRowHeight), height)
      }, {
        dynamic: slots.header,
        fixed: slots.row
      })]);
    };
  }
});

export { TableGrid as default };
//# sourceMappingURL=table-grid.mjs.map
