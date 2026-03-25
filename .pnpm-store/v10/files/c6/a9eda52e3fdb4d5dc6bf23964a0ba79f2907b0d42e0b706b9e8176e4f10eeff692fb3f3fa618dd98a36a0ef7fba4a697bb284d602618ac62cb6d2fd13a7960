'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
require('../../../constants/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var types = require('../../../utils/types.js');
var event = require('../../../constants/event.js');

const checkTagProps = runtime.buildProps({
  checked: {
    type: Boolean,
    default: false
  }
});
const checkTagEmits = {
  "update:checked": (value) => types.isBoolean(value),
  [event.CHANGE_EVENT]: (value) => types.isBoolean(value)
};

exports.checkTagEmits = checkTagEmits;
exports.checkTagProps = checkTagProps;
//# sourceMappingURL=check-tag.js.map
