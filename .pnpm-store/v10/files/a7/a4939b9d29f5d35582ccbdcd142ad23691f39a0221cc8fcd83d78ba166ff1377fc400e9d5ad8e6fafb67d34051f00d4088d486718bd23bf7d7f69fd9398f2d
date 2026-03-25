'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var useTable = require('./use-table.js');
var tokens = require('./tokens.js');
var table = require('./table.js');
var mainTable = require('./renderers/main-table.js');
var leftTable = require('./renderers/left-table.js');
var rightTable = require('./renderers/right-table.js');
var row = require('./renderers/row.js');
var cell = require('./renderers/cell.js');
var header = require('./renderers/header.js');
var headerCell = require('./renderers/header-cell.js');
var footer = require('./renderers/footer.js');
var empty = require('./renderers/empty.js');
var overlay = require('./renderers/overlay.js');
var index = require('../../../hooks/use-namespace/index.js');

function _isSlot(s) {
  return typeof s === "function" || Object.prototype.toString.call(s) === "[object Object]" && !vue.isVNode(s);
}
const COMPONENT_NAME = "ElTableV2";
const TableV2 = vue.defineComponent({
  name: COMPONENT_NAME,
  props: table.tableV2Props,
  setup(props, {
    slots,
    expose
  }) {
    const ns = index.useNamespace("table-v2");
    const {
      columnsStyles,
      fixedColumnsOnLeft,
      fixedColumnsOnRight,
      mainColumns,
      mainTableHeight,
      fixedTableHeight,
      leftTableWidth,
      rightTableWidth,
      data,
      depthMap,
      expandedRowKeys,
      hasFixedColumns,
      hoveringRowKey,
      mainTableRef,
      leftTableRef,
      rightTableRef,
      isDynamic,
      isResetting,
      isScrolling,
      bodyWidth,
      emptyStyle,
      rootStyle,
      headerWidth,
      footerHeight,
      showEmpty,
      scrollTo,
      scrollToLeft,
      scrollToTop,
      scrollToRow,
      getRowHeight,
      onColumnSorted,
      onRowHeightChange,
      onRowHovered,
      onRowExpanded,
      onRowsRendered,
      onScroll,
      onVerticalScroll
    } = useTable.useTable(props);
    expose({
      scrollTo,
      scrollToLeft,
      scrollToTop,
      scrollToRow
    });
    vue.provide(tokens.TableV2InjectionKey, {
      ns,
      isResetting,
      hoveringRowKey,
      isScrolling
    });
    return () => {
      const {
        cache,
        cellProps,
        estimatedRowHeight,
        expandColumnKey,
        fixedData,
        headerHeight,
        headerClass,
        headerProps,
        headerCellProps,
        sortBy,
        sortState,
        rowHeight,
        rowClass,
        rowEventHandlers,
        rowKey,
        rowProps,
        scrollbarAlwaysOn,
        indentSize,
        iconSize,
        useIsScrolling,
        vScrollbarSize,
        width
      } = props;
      const _data = vue.unref(data);
      const mainTableProps = {
        cache,
        class: ns.e("main"),
        columns: vue.unref(mainColumns),
        data: _data,
        fixedData,
        estimatedRowHeight,
        bodyWidth: vue.unref(bodyWidth) + vScrollbarSize,
        headerHeight,
        headerWidth: vue.unref(headerWidth),
        height: vue.unref(mainTableHeight),
        mainTableRef,
        rowKey,
        rowHeight,
        scrollbarAlwaysOn,
        scrollbarStartGap: 2,
        scrollbarEndGap: vScrollbarSize,
        useIsScrolling,
        width,
        getRowHeight,
        onRowsRendered,
        onScroll
      };
      const leftColumnsWidth = vue.unref(leftTableWidth);
      const _fixedTableHeight = vue.unref(fixedTableHeight);
      const leftTableProps = {
        cache,
        class: ns.e("left"),
        columns: vue.unref(fixedColumnsOnLeft),
        data: _data,
        estimatedRowHeight,
        leftTableRef,
        rowHeight,
        bodyWidth: leftColumnsWidth,
        headerWidth: leftColumnsWidth,
        headerHeight,
        height: _fixedTableHeight,
        rowKey,
        scrollbarAlwaysOn,
        scrollbarStartGap: 2,
        scrollbarEndGap: vScrollbarSize,
        useIsScrolling,
        width: leftColumnsWidth,
        getRowHeight,
        onScroll: onVerticalScroll
      };
      const rightColumnsWidth = vue.unref(rightTableWidth);
      const rightColumnsWidthWithScrollbar = rightColumnsWidth + vScrollbarSize;
      const rightTableProps = {
        cache,
        class: ns.e("right"),
        columns: vue.unref(fixedColumnsOnRight),
        data: _data,
        estimatedRowHeight,
        rightTableRef,
        rowHeight,
        bodyWidth: rightColumnsWidthWithScrollbar,
        headerWidth: rightColumnsWidthWithScrollbar,
        headerHeight,
        height: _fixedTableHeight,
        rowKey,
        scrollbarAlwaysOn,
        scrollbarStartGap: 2,
        scrollbarEndGap: vScrollbarSize,
        width: rightColumnsWidthWithScrollbar,
        style: `--${vue.unref(ns.namespace)}-table-scrollbar-size: ${vScrollbarSize}px`,
        useIsScrolling,
        getRowHeight,
        onScroll: onVerticalScroll
      };
      const _columnsStyles = vue.unref(columnsStyles);
      const tableRowProps = {
        ns,
        depthMap: vue.unref(depthMap),
        columnsStyles: _columnsStyles,
        expandColumnKey,
        expandedRowKeys: vue.unref(expandedRowKeys),
        estimatedRowHeight,
        hasFixedColumns: vue.unref(hasFixedColumns),
        hoveringRowKey: vue.unref(hoveringRowKey),
        rowProps,
        rowClass,
        rowKey,
        rowEventHandlers,
        onRowHovered,
        onRowExpanded,
        onRowHeightChange
      };
      const tableCellProps = {
        cellProps,
        expandColumnKey,
        indentSize,
        iconSize,
        rowKey,
        expandedRowKeys: vue.unref(expandedRowKeys),
        ns
      };
      const tableHeaderProps = {
        ns,
        headerClass,
        headerProps,
        columnsStyles: _columnsStyles
      };
      const tableHeaderCellProps = {
        ns,
        sortBy,
        sortState,
        headerCellProps,
        onColumnSorted
      };
      const tableSlots = {
        row: (props2) => vue.createVNode(row["default"], vue.mergeProps(props2, tableRowProps), {
          row: slots.row,
          cell: (props3) => {
            let _slot;
            return slots.cell ? vue.createVNode(cell["default"], vue.mergeProps(props3, tableCellProps, {
              "style": _columnsStyles[props3.column.key]
            }), _isSlot(_slot = slots.cell(props3)) ? _slot : {
              default: () => [_slot]
            }) : vue.createVNode(cell["default"], vue.mergeProps(props3, tableCellProps, {
              "style": _columnsStyles[props3.column.key]
            }), null);
          }
        }),
        header: (props2) => vue.createVNode(header["default"], vue.mergeProps(props2, tableHeaderProps), {
          header: slots.header,
          cell: (props3) => {
            let _slot2;
            return slots["header-cell"] ? vue.createVNode(headerCell["default"], vue.mergeProps(props3, tableHeaderCellProps, {
              "style": _columnsStyles[props3.column.key]
            }), _isSlot(_slot2 = slots["header-cell"](props3)) ? _slot2 : {
              default: () => [_slot2]
            }) : vue.createVNode(headerCell["default"], vue.mergeProps(props3, tableHeaderCellProps, {
              "style": _columnsStyles[props3.column.key]
            }), null);
          }
        })
      };
      const rootKls = [props.class, ns.b(), ns.e("root"), {
        [ns.is("dynamic")]: vue.unref(isDynamic)
      }];
      const footerProps = {
        class: ns.e("footer"),
        style: vue.unref(footerHeight)
      };
      return vue.createVNode("div", {
        "class": rootKls,
        "style": vue.unref(rootStyle)
      }, [vue.createVNode(mainTable["default"], mainTableProps, _isSlot(tableSlots) ? tableSlots : {
        default: () => [tableSlots]
      }), vue.createVNode(leftTable["default"], leftTableProps, _isSlot(tableSlots) ? tableSlots : {
        default: () => [tableSlots]
      }), vue.createVNode(rightTable["default"], rightTableProps, _isSlot(tableSlots) ? tableSlots : {
        default: () => [tableSlots]
      }), slots.footer && vue.createVNode(footer["default"], footerProps, {
        default: slots.footer
      }), vue.unref(showEmpty) && vue.createVNode(empty["default"], {
        "class": ns.e("empty"),
        "style": vue.unref(emptyStyle)
      }, {
        default: slots.empty
      }), slots.overlay && vue.createVNode(overlay["default"], {
        "class": ns.e("overlay")
      }, {
        default: slots.overlay
      })]);
    };
  }
});

exports["default"] = TableV2;
//# sourceMappingURL=table-v2.js.map
