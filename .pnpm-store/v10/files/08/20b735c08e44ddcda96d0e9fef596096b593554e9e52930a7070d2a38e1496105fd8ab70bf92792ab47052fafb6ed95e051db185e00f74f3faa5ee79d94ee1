'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../constants/index.js');
require('../../../utils/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var size = require('../../../constants/size.js');

const formItemValidateStates = [
  "",
  "error",
  "validating",
  "success"
];
const formItemProps = runtime.buildProps({
  label: String,
  labelWidth: {
    type: [String, Number],
    default: ""
  },
  prop: {
    type: runtime.definePropType([String, Array])
  },
  required: {
    type: Boolean,
    default: void 0
  },
  rules: {
    type: runtime.definePropType([Object, Array])
  },
  error: String,
  validateStatus: {
    type: String,
    values: formItemValidateStates
  },
  for: String,
  inlineMessage: {
    type: [String, Boolean],
    default: ""
  },
  showMessage: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    values: size.componentSizes
  }
});

exports.formItemProps = formItemProps;
exports.formItemValidateStates = formItemValidateStates;
//# sourceMappingURL=form-item.js.map
