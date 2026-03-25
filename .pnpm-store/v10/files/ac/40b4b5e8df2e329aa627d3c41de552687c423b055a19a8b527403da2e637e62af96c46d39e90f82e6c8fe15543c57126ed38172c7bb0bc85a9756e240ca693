'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../virtual-list/index.js');
require('../../../utils/index.js');
require('./components/index.js');
var tokens = require('./tokens.js');
var grid = require('./grid.js');
var utils = require('./utils.js');
var shared = require('@vue/shared');
var types = require('../../../utils/types.js');
var dynamicSizeGrid = require('../../virtual-list/src/components/dynamic-size-grid.js');
var fixedSizeGrid = require('../../virtual-list/src/components/fixed-size-grid.js');
var header = require('./components/header.js');

const COMPONENT_NAME = "ElTableV2Grid";
const useTableGrid = (props) => {
  const headerRef = vue.ref();
  const bodyRef = vue.ref();
  const totalHeight = vue.computed(() => {
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
  const fixedRowHeight = vue.computed(() => {
    const {
      fixedData,
      rowHeight
    } = props;
    return ((fixedData == null ? void 0 : fixedData.length) || 0) * rowHeight;
  });
  const headerHeight = vue.computed(() => utils.sum(props.headerHeight));
  const gridHeight = vue.computed(() => {
    const {
      height
    } = props;
    return Math.max(0, height - vue.unref(headerHeight) - vue.unref(fixedRowHeight));
  });
  const hasHeader = vue.computed(() => {
    return vue.unref(headerHeight) + vue.unref(fixedRowHeight) > 0;
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
    const header$ = vue.unref(headerRef);
    const body$ = vue.unref(bodyRef);
    if (!header$ || !body$)
      return;
    if (shared.isObject(leftOrOptions)) {
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
    (_a = vue.unref(bodyRef)) == null ? void 0 : _a.scrollTo({
      scrollTop
    });
  }
  function scrollToRow(row, strategy) {
    var _a;
    (_a = vue.unref(bodyRef)) == null ? void 0 : _a.scrollToItem(row, 1, strategy);
  }
  function forceUpdate() {
    var _a, _b;
    (_a = vue.unref(bodyRef)) == null ? void 0 : _a.$forceUpdate();
    (_b = vue.unref(headerRef)) == null ? void 0 : _b.$forceUpdate();
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
const TableGrid = vue.defineComponent({
  name: COMPONENT_NAME,
  props: grid.tableV2GridProps,
  setup(props, {
    slots,
    expose
  }) {
    const {
      ns
    } = vue.inject(tokens.TableV2InjectionKey);
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
      const isDynamicRowEnabled = types.isNumber(estimatedRowHeight);
      const Grid = isDynamicRowEnabled ? dynamicSizeGrid["default"] : fixedSizeGrid["default"];
      const _headerHeight = vue.unref(headerHeight);
      return vue.createVNode("div", {
        "role": "table",
        "class": [ns.e("table"), props.class],
        "style": style
      }, [vue.createVNode(Grid, {
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
        "height": vue.unref(gridHeight),
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
      }), vue.unref(hasHeader) && vue.createVNode(header["default"], {
        "ref": headerRef,
        "class": ns.e("header-wrapper"),
        "columns": columns,
        "headerData": data,
        "headerHeight": props.headerHeight,
        "fixedHeaderData": fixedData,
        "rowWidth": headerWidth,
        "rowHeight": rowHeight,
        "width": width,
        "height": Math.min(_headerHeight + vue.unref(fixedRowHeight), height)
      }, {
        dynamic: slots.header,
        fixed: slots.row
      })]);
    };
  }
});

exports["default"] = TableGrid;
//# sourceMappingURL=table-grid.js.map
