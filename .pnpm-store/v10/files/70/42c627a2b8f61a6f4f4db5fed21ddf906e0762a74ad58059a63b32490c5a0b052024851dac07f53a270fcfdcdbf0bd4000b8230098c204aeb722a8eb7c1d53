'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
var common = require('./common.js');
var runtime = require('../../../utils/vue/props/runtime.js');

const requiredNumberType = {
  type: Number,
  required: true
};
const tableV2HeaderProps = runtime.buildProps({
  class: String,
  columns: common.columns,
  fixedHeaderData: {
    type: runtime.definePropType(Array)
  },
  headerData: {
    type: runtime.definePropType(Array),
    required: true
  },
  headerHeight: {
    type: runtime.definePropType([Number, Array]),
    default: 50
  },
  rowWidth: requiredNumberType,
  rowHeight: {
    type: Number,
    default: 50
  },
  height: requiredNumberType,
  width: requiredNumberType
});

exports.tableV2HeaderProps = tableV2HeaderProps;
//# sourceMappingURL=header.js.map
