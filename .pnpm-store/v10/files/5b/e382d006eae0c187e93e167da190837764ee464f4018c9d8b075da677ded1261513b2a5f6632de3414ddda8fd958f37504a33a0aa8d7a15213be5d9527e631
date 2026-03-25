'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var lodashUnified = require('lodash-unified');
require('../../../utils/index.js');
require('../../../constants/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var typescript = require('../../../utils/typescript.js');
var shared = require('@vue/shared');
var event = require('../../../constants/event.js');

const LEFT_CHECK_CHANGE_EVENT = "left-check-change";
const RIGHT_CHECK_CHANGE_EVENT = "right-check-change";
const transferProps = runtime.buildProps({
  data: {
    type: runtime.definePropType(Array),
    default: () => []
  },
  titles: {
    type: runtime.definePropType(Array),
    default: () => []
  },
  buttonTexts: {
    type: runtime.definePropType(Array),
    default: () => []
  },
  filterPlaceholder: String,
  filterMethod: {
    type: runtime.definePropType(Function)
  },
  leftDefaultChecked: {
    type: runtime.definePropType(Array),
    default: () => []
  },
  rightDefaultChecked: {
    type: runtime.definePropType(Array),
    default: () => []
  },
  renderContent: {
    type: runtime.definePropType(Function)
  },
  modelValue: {
    type: runtime.definePropType(Array),
    default: () => []
  },
  format: {
    type: runtime.definePropType(Object),
    default: () => ({})
  },
  filterable: Boolean,
  props: {
    type: runtime.definePropType(Object),
    default: () => typescript.mutable({
      label: "label",
      key: "key",
      disabled: "disabled"
    })
  },
  targetOrder: {
    type: String,
    values: ["original", "push", "unshift"],
    default: "original"
  },
  validateEvent: {
    type: Boolean,
    default: true
  }
});
const transferCheckedChangeFn = (value, movedKeys) => [value, movedKeys].every(shared.isArray) || shared.isArray(value) && lodashUnified.isNil(movedKeys);
const transferEmits = {
  [event.CHANGE_EVENT]: (value, direction, movedKeys) => [value, movedKeys].every(shared.isArray) && ["left", "right"].includes(direction),
  [event.UPDATE_MODEL_EVENT]: (value) => shared.isArray(value),
  [LEFT_CHECK_CHANGE_EVENT]: transferCheckedChangeFn,
  [RIGHT_CHECK_CHANGE_EVENT]: transferCheckedChangeFn
};

exports.LEFT_CHECK_CHANGE_EVENT = LEFT_CHECK_CHANGE_EVENT;
exports.RIGHT_CHECK_CHANGE_EVENT = RIGHT_CHECK_CHANGE_EVENT;
exports.transferCheckedChangeFn = transferCheckedChangeFn;
exports.transferEmits = transferEmits;
exports.transferProps = transferProps;
//# sourceMappingURL=transfer.js.map
