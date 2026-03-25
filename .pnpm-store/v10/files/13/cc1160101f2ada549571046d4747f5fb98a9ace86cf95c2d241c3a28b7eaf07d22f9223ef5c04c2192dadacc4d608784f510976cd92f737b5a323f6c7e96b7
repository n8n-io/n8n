'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var shared = require('@vue/shared');

const menuItemProps = runtime.buildProps({
  index: {
    type: runtime.definePropType([String, null]),
    default: null
  },
  route: {
    type: runtime.definePropType([String, Object])
  },
  disabled: Boolean
});
const menuItemEmits = {
  click: (item) => shared.isString(item.index) && Array.isArray(item.indexPath)
};

exports.menuItemEmits = menuItemEmits;
exports.menuItemProps = menuItemProps;
//# sourceMappingURL=menu-item.js.map
