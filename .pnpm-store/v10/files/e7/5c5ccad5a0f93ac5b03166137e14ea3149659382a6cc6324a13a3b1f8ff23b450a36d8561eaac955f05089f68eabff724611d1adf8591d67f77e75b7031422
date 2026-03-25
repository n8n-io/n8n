'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var icon = require('../../../utils/vue/icon.js');

const notificationTypes = [
  "success",
  "info",
  "warning",
  "error"
];
const notificationProps = runtime.buildProps({
  customClass: {
    type: String,
    default: ""
  },
  dangerouslyUseHTMLString: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number,
    default: 4500
  },
  icon: {
    type: icon.iconPropType
  },
  id: {
    type: String,
    default: ""
  },
  message: {
    type: runtime.definePropType([String, Object]),
    default: ""
  },
  offset: {
    type: Number,
    default: 0
  },
  onClick: {
    type: runtime.definePropType(Function),
    default: () => void 0
  },
  onClose: {
    type: runtime.definePropType(Function),
    required: true
  },
  position: {
    type: String,
    values: ["top-right", "top-left", "bottom-right", "bottom-left"],
    default: "top-right"
  },
  showClose: {
    type: Boolean,
    default: true
  },
  title: {
    type: String,
    default: ""
  },
  type: {
    type: String,
    values: [...notificationTypes, ""],
    default: ""
  },
  zIndex: Number
});
const notificationEmits = {
  destroy: () => true
};

exports.notificationEmits = notificationEmits;
exports.notificationProps = notificationProps;
exports.notificationTypes = notificationTypes;
//# sourceMappingURL=notification.js.map
