'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
require('../../../constants/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var size = require('../../../constants/size.js');
var types = require('../../../utils/types.js');
var icon = require('../../../utils/vue/icon.js');

const avatarProps = runtime.buildProps({
  size: {
    type: [Number, String],
    values: size.componentSizes,
    default: "",
    validator: (val) => types.isNumber(val)
  },
  shape: {
    type: String,
    values: ["circle", "square"],
    default: "circle"
  },
  icon: {
    type: icon.iconPropType
  },
  src: {
    type: String,
    default: ""
  },
  alt: String,
  srcSet: String,
  fit: {
    type: runtime.definePropType(String),
    default: "cover"
  }
});
const avatarEmits = {
  error: (evt) => evt instanceof Event
};

exports.avatarEmits = avatarEmits;
exports.avatarProps = avatarProps;
//# sourceMappingURL=avatar.js.map
