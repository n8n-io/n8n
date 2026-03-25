'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
require('../../virtual-list/index.js');
var common = require('./common.js');
var row = require('./row.js');
var header = require('./header.js');
var grid = require('./grid.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var props = require('../../virtual-list/src/props.js');

const tableV2Props = runtime.buildProps({
  cache: grid.tableV2GridProps.cache,
  estimatedRowHeight: row.tableV2RowProps.estimatedRowHeight,
  rowKey: common.rowKey,
  headerClass: {
    type: runtime.definePropType([
      String,
      Function
    ])
  },
  headerProps: {
    type: runtime.definePropType([
      Object,
      Function
    ])
  },
  headerCellProps: {
    type: runtime.definePropType([
      Object,
      Function
    ])
  },
  headerHeight: header.tableV2HeaderProps.headerHeight,
  footerHeight: {
    type: Number,
    default: 0
  },
  rowClass: {
    type: runtime.definePropType([String, Function])
  },
  rowProps: {
    type: runtime.definePropType([Object, Function])
  },
  rowHeight: {
    type: Number,
    default: 50
  },
  cellProps: {
    type: runtime.definePropType([
      Object,
      Function
    ])
  },
  columns: common.columns,
  data: common.dataType,
  dataGetter: {
    type: runtime.definePropType(Function)
  },
  fixedData: common.fixedDataType,
  expandColumnKey: row.tableV2RowProps.expandColumnKey,
  expandedRowKeys: common.expandKeys,
  defaultExpandedRowKeys: common.expandKeys,
  class: common.classType,
  fixed: Boolean,
  style: {
    type: runtime.definePropType(Object)
  },
  width: common.requiredNumber,
  height: common.requiredNumber,
  maxHeight: Number,
  useIsScrolling: Boolean,
  indentSize: {
    type: Number,
    default: 12
  },
  iconSize: {
    type: Number,
    default: 12
  },
  hScrollbarSize: props.virtualizedGridProps.hScrollbarSize,
  vScrollbarSize: props.virtualizedGridProps.vScrollbarSize,
  scrollbarAlwaysOn: props.virtualizedScrollbarProps.alwaysOn,
  sortBy: {
    type: runtime.definePropType(Object),
    default: () => ({})
  },
  sortState: {
    type: runtime.definePropType(Object),
    default: void 0
  },
  onColumnSort: {
    type: runtime.definePropType(Function)
  },
  onExpandedRowsChange: {
    type: runtime.definePropType(Function)
  },
  onEndReached: {
    type: runtime.definePropType(Function)
  },
  onRowExpand: row.tableV2RowProps.onRowExpand,
  onScroll: grid.tableV2GridProps.onScroll,
  onRowsRendered: grid.tableV2GridProps.onRowsRendered,
  rowEventHandlers: row.tableV2RowProps.rowEventHandlers
});

exports.tableV2Props = tableV2Props;
//# sourceMappingURL=table.js.map
