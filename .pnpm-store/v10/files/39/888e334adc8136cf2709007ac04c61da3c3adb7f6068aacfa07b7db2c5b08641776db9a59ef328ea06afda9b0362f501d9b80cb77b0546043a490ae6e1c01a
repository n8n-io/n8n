'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var iconsVue = require('@element-plus/icons-vue');
require('../../../constants/index.js');
require('../../../utils/index.js');
require('../../../hooks/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var typescript = require('../../../utils/typescript.js');
var icon = require('../../../utils/vue/icon.js');
var index = require('../../../hooks/use-size/index.js');
var event = require('../../../constants/event.js');
var types = require('../../../utils/types.js');

const rateProps = runtime.buildProps({
  modelValue: {
    type: Number,
    default: 0
  },
  id: {
    type: String,
    default: void 0
  },
  lowThreshold: {
    type: Number,
    default: 2
  },
  highThreshold: {
    type: Number,
    default: 4
  },
  max: {
    type: Number,
    default: 5
  },
  colors: {
    type: runtime.definePropType([Array, Object]),
    default: () => typescript.mutable(["", "", ""])
  },
  voidColor: {
    type: String,
    default: ""
  },
  disabledVoidColor: {
    type: String,
    default: ""
  },
  icons: {
    type: runtime.definePropType([Array, Object]),
    default: () => [iconsVue.StarFilled, iconsVue.StarFilled, iconsVue.StarFilled]
  },
  voidIcon: {
    type: icon.iconPropType,
    default: () => iconsVue.Star
  },
  disabledVoidIcon: {
    type: icon.iconPropType,
    default: () => iconsVue.StarFilled
  },
  disabled: Boolean,
  allowHalf: Boolean,
  showText: Boolean,
  showScore: Boolean,
  textColor: {
    type: String,
    default: ""
  },
  texts: {
    type: runtime.definePropType(Array),
    default: () => typescript.mutable([
      "Extremely bad",
      "Disappointed",
      "Fair",
      "Satisfied",
      "Surprise"
    ])
  },
  scoreTemplate: {
    type: String,
    default: "{value}"
  },
  size: index.useSizeProp,
  label: {
    type: String,
    default: void 0
  },
  clearable: {
    type: Boolean,
    default: false
  }
});
const rateEmits = {
  [event.CHANGE_EVENT]: (value) => types.isNumber(value),
  [event.UPDATE_MODEL_EVENT]: (value) => types.isNumber(value)
};

exports.rateEmits = rateEmits;
exports.rateProps = rateProps;
//# sourceMappingURL=rate.js.map
