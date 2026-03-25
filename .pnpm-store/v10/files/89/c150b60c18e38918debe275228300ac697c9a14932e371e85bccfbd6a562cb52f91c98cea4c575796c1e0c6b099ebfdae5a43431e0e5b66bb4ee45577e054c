'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
require('../../dialog/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var dialog = require('../../dialog/src/dialog.js');

const drawerProps = runtime.buildProps({
  ...dialog.dialogProps,
  direction: {
    type: String,
    default: "rtl",
    values: ["ltr", "rtl", "ttb", "btt"]
  },
  size: {
    type: [String, Number],
    default: "30%"
  },
  withHeader: {
    type: Boolean,
    default: true
  },
  modalFade: {
    type: Boolean,
    default: true
  },
  headerAriaLevel: {
    type: String,
    default: "2"
  }
});
const drawerEmits = dialog.dialogEmits;

exports.drawerEmits = drawerEmits;
exports.drawerProps = drawerProps;
//# sourceMappingURL=drawer.js.map
