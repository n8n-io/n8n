'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../hooks/index.js');
require('../../../utils/index.js');
var iconsVue = require('@element-plus/icons-vue');
var runtime = require('../../../utils/vue/props/runtime.js');
var index = require('../../../hooks/use-size/index.js');
var icon = require('../../../utils/vue/icon.js');

const buttonTypes = [
  "default",
  "primary",
  "success",
  "warning",
  "info",
  "danger",
  "text",
  ""
];
const buttonNativeTypes = ["button", "submit", "reset"];
const buttonProps = runtime.buildProps({
  size: index.useSizeProp,
  disabled: Boolean,
  type: {
    type: String,
    values: buttonTypes,
    default: ""
  },
  icon: {
    type: icon.iconPropType
  },
  nativeType: {
    type: String,
    values: buttonNativeTypes,
    default: "button"
  },
  loading: Boolean,
  loadingIcon: {
    type: icon.iconPropType,
    default: () => iconsVue.Loading
  },
  plain: Boolean,
  text: Boolean,
  link: Boolean,
  bg: Boolean,
  autofocus: Boolean,
  round: Boolean,
  circle: Boolean,
  color: String,
  dark: Boolean,
  autoInsertSpace: {
    type: Boolean,
    default: void 0
  },
  tag: {
    type: runtime.definePropType([String, Object]),
    default: "button"
  }
});
const buttonEmits = {
  click: (evt) => evt instanceof MouseEvent
};

exports.buttonEmits = buttonEmits;
exports.buttonNativeTypes = buttonNativeTypes;
exports.buttonProps = buttonProps;
exports.buttonTypes = buttonTypes;
//# sourceMappingURL=button.js.map
