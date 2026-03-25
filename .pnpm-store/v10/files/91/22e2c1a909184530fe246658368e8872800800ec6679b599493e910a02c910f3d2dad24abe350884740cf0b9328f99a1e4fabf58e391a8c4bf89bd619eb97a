'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../button/index.js');
var iconsVue = require('@element-plus/icons-vue');
require('../../../utils/index.js');
require('../../tooltip/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var button = require('../../button/src/button.js');
var icon = require('../../../utils/vue/icon.js');
var content = require('../../tooltip/src/content.js');

const popconfirmProps = runtime.buildProps({
  title: String,
  confirmButtonText: String,
  cancelButtonText: String,
  confirmButtonType: {
    type: String,
    values: button.buttonTypes,
    default: "primary"
  },
  cancelButtonType: {
    type: String,
    values: button.buttonTypes,
    default: "text"
  },
  icon: {
    type: icon.iconPropType,
    default: () => iconsVue.QuestionFilled
  },
  iconColor: {
    type: String,
    default: "#f90"
  },
  hideIcon: {
    type: Boolean,
    default: false
  },
  hideAfter: {
    type: Number,
    default: 200
  },
  teleported: content.useTooltipContentProps.teleported,
  persistent: content.useTooltipContentProps.persistent,
  width: {
    type: [String, Number],
    default: 150
  }
});
const popconfirmEmits = {
  confirm: (e) => e instanceof MouseEvent,
  cancel: (e) => e instanceof MouseEvent
};

exports.popconfirmEmits = popconfirmEmits;
exports.popconfirmProps = popconfirmProps;
//# sourceMappingURL=popconfirm.js.map
