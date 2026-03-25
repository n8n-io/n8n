'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var shared = require('@vue/shared');
require('../../../utils/index.js');
require('../../../constants/index.js');
require('../../../hooks/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var index = require('../../../hooks/use-size/index.js');
var icon = require('../../../utils/vue/icon.js');
var typescript = require('../../../utils/typescript.js');
var event = require('../../../constants/event.js');

const inputProps = runtime.buildProps({
  id: {
    type: String,
    default: void 0
  },
  size: index.useSizeProp,
  disabled: Boolean,
  modelValue: {
    type: runtime.definePropType([
      String,
      Number,
      Object
    ]),
    default: ""
  },
  type: {
    type: String,
    default: "text"
  },
  resize: {
    type: String,
    values: ["none", "both", "horizontal", "vertical"]
  },
  autosize: {
    type: runtime.definePropType([Boolean, Object]),
    default: false
  },
  autocomplete: {
    type: String,
    default: "off"
  },
  formatter: {
    type: Function
  },
  parser: {
    type: Function
  },
  placeholder: {
    type: String
  },
  form: {
    type: String
  },
  readonly: {
    type: Boolean,
    default: false
  },
  clearable: {
    type: Boolean,
    default: false
  },
  showPassword: {
    type: Boolean,
    default: false
  },
  showWordLimit: {
    type: Boolean,
    default: false
  },
  suffixIcon: {
    type: icon.iconPropType
  },
  prefixIcon: {
    type: icon.iconPropType
  },
  containerRole: {
    type: String,
    default: void 0
  },
  label: {
    type: String,
    default: void 0
  },
  tabindex: {
    type: [String, Number],
    default: 0
  },
  validateEvent: {
    type: Boolean,
    default: true
  },
  inputStyle: {
    type: runtime.definePropType([Object, Array, String]),
    default: () => typescript.mutable({})
  },
  autofocus: {
    type: Boolean,
    default: false
  }
});
const inputEmits = {
  [event.UPDATE_MODEL_EVENT]: (value) => shared.isString(value),
  input: (value) => shared.isString(value),
  change: (value) => shared.isString(value),
  focus: (evt) => evt instanceof FocusEvent,
  blur: (evt) => evt instanceof FocusEvent,
  clear: () => true,
  mouseleave: (evt) => evt instanceof MouseEvent,
  mouseenter: (evt) => evt instanceof MouseEvent,
  keydown: (evt) => evt instanceof Event,
  compositionstart: (evt) => evt instanceof CompositionEvent,
  compositionupdate: (evt) => evt instanceof CompositionEvent,
  compositionend: (evt) => evt instanceof CompositionEvent
};

exports.inputEmits = inputEmits;
exports.inputProps = inputProps;
//# sourceMappingURL=input.js.map
