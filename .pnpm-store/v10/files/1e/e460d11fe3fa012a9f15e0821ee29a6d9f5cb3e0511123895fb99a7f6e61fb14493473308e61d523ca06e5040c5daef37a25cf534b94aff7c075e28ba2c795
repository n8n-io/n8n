'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../../utils/index.js');
require('../../../../hooks/index.js');
var iconsVue = require('@element-plus/icons-vue');
var shared = require('../props/shared.js');
var runtime = require('../../../../utils/vue/props/runtime.js');
var index = require('../../../../hooks/use-size/index.js');

const timePickerDefaultProps = runtime.buildProps({
  id: {
    type: runtime.definePropType([Array, String])
  },
  name: {
    type: runtime.definePropType([Array, String]),
    default: ""
  },
  popperClass: {
    type: String,
    default: ""
  },
  format: String,
  valueFormat: String,
  dateFormat: String,
  timeFormat: String,
  type: {
    type: String,
    default: ""
  },
  clearable: {
    type: Boolean,
    default: true
  },
  clearIcon: {
    type: runtime.definePropType([String, Object]),
    default: iconsVue.CircleClose
  },
  editable: {
    type: Boolean,
    default: true
  },
  prefixIcon: {
    type: runtime.definePropType([String, Object]),
    default: ""
  },
  size: index.useSizeProp,
  readonly: Boolean,
  disabled: Boolean,
  placeholder: {
    type: String,
    default: ""
  },
  popperOptions: {
    type: runtime.definePropType(Object),
    default: () => ({})
  },
  modelValue: {
    type: runtime.definePropType([Date, Array, String, Number]),
    default: ""
  },
  rangeSeparator: {
    type: String,
    default: "-"
  },
  startPlaceholder: String,
  endPlaceholder: String,
  defaultValue: {
    type: runtime.definePropType([Date, Array])
  },
  defaultTime: {
    type: runtime.definePropType([Date, Array])
  },
  isRange: Boolean,
  ...shared.disabledTimeListsProps,
  disabledDate: {
    type: Function
  },
  cellClassName: {
    type: Function
  },
  shortcuts: {
    type: Array,
    default: () => []
  },
  arrowControl: Boolean,
  label: {
    type: String,
    default: void 0
  },
  tabindex: {
    type: runtime.definePropType([String, Number]),
    default: 0
  },
  validateEvent: {
    type: Boolean,
    default: true
  },
  unlinkPanels: Boolean
});

exports.timePickerDefaultProps = timePickerDefaultProps;
//# sourceMappingURL=props.js.map
