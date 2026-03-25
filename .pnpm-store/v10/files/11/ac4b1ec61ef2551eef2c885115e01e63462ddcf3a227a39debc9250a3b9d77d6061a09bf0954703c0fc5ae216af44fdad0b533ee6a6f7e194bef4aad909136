'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../constants/index.js');
require('../../../utils/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var size = require('../../../constants/size.js');
var shared = require('@vue/shared');
var types = require('../../../utils/types.js');

const formMetaProps = runtime.buildProps({
  size: {
    type: String,
    values: size.componentSizes
  },
  disabled: Boolean
});
const formProps = runtime.buildProps({
  ...formMetaProps,
  model: Object,
  rules: {
    type: runtime.definePropType(Object)
  },
  labelPosition: {
    type: String,
    values: ["left", "right", "top"],
    default: "right"
  },
  requireAsteriskPosition: {
    type: String,
    values: ["left", "right"],
    default: "left"
  },
  labelWidth: {
    type: [String, Number],
    default: ""
  },
  labelSuffix: {
    type: String,
    default: ""
  },
  inline: Boolean,
  inlineMessage: Boolean,
  statusIcon: Boolean,
  showMessage: {
    type: Boolean,
    default: true
  },
  validateOnRuleChange: {
    type: Boolean,
    default: true
  },
  hideRequiredAsterisk: Boolean,
  scrollToError: Boolean,
  scrollIntoViewOptions: {
    type: [Object, Boolean]
  }
});
const formEmits = {
  validate: (prop, isValid, message) => (shared.isArray(prop) || shared.isString(prop)) && types.isBoolean(isValid) && shared.isString(message)
};

exports.formEmits = formEmits;
exports.formProps = formProps;
//# sourceMappingURL=form.js.map
