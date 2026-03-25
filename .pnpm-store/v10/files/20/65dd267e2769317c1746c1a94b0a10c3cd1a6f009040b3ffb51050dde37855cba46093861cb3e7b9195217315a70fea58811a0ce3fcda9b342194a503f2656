'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var icon = require('../../../utils/vue/icon.js');

const linkProps = runtime.buildProps({
  type: {
    type: String,
    values: ["primary", "success", "warning", "info", "danger", "default"],
    default: "default"
  },
  underline: {
    type: Boolean,
    default: true
  },
  disabled: { type: Boolean, default: false },
  href: { type: String, default: "" },
  icon: {
    type: icon.iconPropType
  }
});
const linkEmits = {
  click: (evt) => evt instanceof MouseEvent
};

exports.linkEmits = linkEmits;
exports.linkProps = linkProps;
//# sourceMappingURL=link.js.map
