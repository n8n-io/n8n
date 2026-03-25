'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
require('../../../constants/index.js');
var types = require('../../../utils/types.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var typescript = require('../../../utils/typescript.js');
var event = require('../../../constants/event.js');

const emitChangeFn = (value) => typeof types.isNumber(value);
const collapseProps = runtime.buildProps({
  accordion: Boolean,
  modelValue: {
    type: runtime.definePropType([Array, String, Number]),
    default: () => typescript.mutable([])
  }
});
const collapseEmits = {
  [event.UPDATE_MODEL_EVENT]: emitChangeFn,
  [event.CHANGE_EVENT]: emitChangeFn
};

exports.collapseEmits = collapseEmits;
exports.collapseProps = collapseProps;
exports.emitChangeFn = emitChangeFn;
//# sourceMappingURL=collapse.js.map
