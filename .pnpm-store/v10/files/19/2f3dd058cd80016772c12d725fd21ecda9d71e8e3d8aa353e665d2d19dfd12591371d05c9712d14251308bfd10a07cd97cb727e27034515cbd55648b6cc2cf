'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
var iconsVue = require('@element-plus/icons-vue');
require('../../../hooks/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var index = require('../../../hooks/use-size/index.js');

const timeSelectProps = runtime.buildProps({
  format: {
    type: String,
    default: "HH:mm"
  },
  modelValue: String,
  disabled: Boolean,
  editable: {
    type: Boolean,
    default: true
  },
  effect: {
    type: String,
    default: "light"
  },
  clearable: {
    type: Boolean,
    default: true
  },
  size: index.useSizeProp,
  placeholder: String,
  start: {
    type: String,
    default: "09:00"
  },
  end: {
    type: String,
    default: "18:00"
  },
  step: {
    type: String,
    default: "00:30"
  },
  minTime: String,
  maxTime: String,
  name: String,
  prefixIcon: {
    type: runtime.definePropType([String, Object]),
    default: () => iconsVue.Clock
  },
  clearIcon: {
    type: runtime.definePropType([String, Object]),
    default: () => iconsVue.CircleClose
  }
});

exports.timeSelectProps = timeSelectProps;
//# sourceMappingURL=time-select.js.map
