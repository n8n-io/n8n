'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
var transfer = require('./transfer.js');
var runtime = require('../../../utils/vue/props/runtime.js');

const CHECKED_CHANGE_EVENT = "checked-change";
const transferPanelProps = runtime.buildProps({
  data: transfer.transferProps.data,
  optionRender: {
    type: runtime.definePropType(Function)
  },
  placeholder: String,
  title: String,
  filterable: Boolean,
  format: transfer.transferProps.format,
  filterMethod: transfer.transferProps.filterMethod,
  defaultChecked: transfer.transferProps.leftDefaultChecked,
  props: transfer.transferProps.props
});
const transferPanelEmits = {
  [CHECKED_CHANGE_EVENT]: transfer.transferCheckedChangeFn
};

exports.CHECKED_CHANGE_EVENT = CHECKED_CHANGE_EVENT;
exports.transferPanelEmits = transferPanelEmits;
exports.transferPanelProps = transferPanelProps;
//# sourceMappingURL=transfer-panel.js.map
