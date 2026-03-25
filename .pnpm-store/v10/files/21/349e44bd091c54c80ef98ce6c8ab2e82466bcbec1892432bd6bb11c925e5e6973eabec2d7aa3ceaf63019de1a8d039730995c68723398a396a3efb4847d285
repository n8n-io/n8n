'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
require('../../virtual-list/index.js');
var common = require('./common.js');
var header = require('./header.js');
var row = require('./row.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var props = require('../../virtual-list/src/props.js');

const tableV2GridProps = runtime.buildProps({
  columns: common.columns,
  data: common.dataType,
  fixedData: common.fixedDataType,
  estimatedRowHeight: row.tableV2RowProps.estimatedRowHeight,
  width: common.requiredNumber,
  height: common.requiredNumber,
  headerWidth: common.requiredNumber,
  headerHeight: header.tableV2HeaderProps.headerHeight,
  bodyWidth: common.requiredNumber,
  rowHeight: common.requiredNumber,
  cache: props.virtualizedListProps.cache,
  useIsScrolling: Boolean,
  scrollbarAlwaysOn: props.virtualizedGridProps.scrollbarAlwaysOn,
  scrollbarStartGap: props.virtualizedGridProps.scrollbarStartGap,
  scrollbarEndGap: props.virtualizedGridProps.scrollbarEndGap,
  class: common.classType,
  style: common.styleType,
  containerStyle: common.styleType,
  getRowHeight: {
    type: runtime.definePropType(Function),
    required: true
  },
  rowKey: row.tableV2RowProps.rowKey,
  onRowsRendered: {
    type: runtime.definePropType(Function)
  },
  onScroll: {
    type: runtime.definePropType(Function)
  }
});

exports.tableV2GridProps = tableV2GridProps;
//# sourceMappingURL=grid.js.map
