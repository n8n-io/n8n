'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
require('../../virtual-list/index.js');
var common = require('./common.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var props = require('../../virtual-list/src/props.js');

const tableV2RowProps = runtime.buildProps({
  class: String,
  columns: common.columns,
  columnsStyles: {
    type: runtime.definePropType(Object),
    required: true
  },
  depth: Number,
  expandColumnKey: common.expandColumnKey,
  estimatedRowHeight: {
    ...props.virtualizedGridProps.estimatedRowHeight,
    default: void 0
  },
  isScrolling: Boolean,
  onRowExpand: {
    type: runtime.definePropType(Function)
  },
  onRowHover: {
    type: runtime.definePropType(Function)
  },
  onRowHeightChange: {
    type: runtime.definePropType(Function)
  },
  rowData: {
    type: runtime.definePropType(Object),
    required: true
  },
  rowEventHandlers: {
    type: runtime.definePropType(Object)
  },
  rowIndex: {
    type: Number,
    required: true
  },
  rowKey: common.rowKey,
  style: {
    type: runtime.definePropType(Object)
  }
});

exports.tableV2RowProps = tableV2RowProps;
//# sourceMappingURL=row.js.map
