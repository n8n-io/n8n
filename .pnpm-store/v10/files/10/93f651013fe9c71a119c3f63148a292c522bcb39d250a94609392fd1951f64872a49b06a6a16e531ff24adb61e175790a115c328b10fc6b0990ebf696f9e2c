'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var core = require('@popperjs/core');
require('../../../hooks/index.js');
require('../../../utils/index.js');
require('../../tooltip/index.js');
var iconsVue = require('@element-plus/icons-vue');
var useProps = require('./useProps.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var icon = require('../../../utils/vue/icon.js');
var content = require('../../tooltip/src/content.js');
var index = require('../../../hooks/use-size/index.js');

const SelectProps = runtime.buildProps({
  allowCreate: Boolean,
  autocomplete: {
    type: runtime.definePropType(String),
    default: "none"
  },
  automaticDropdown: Boolean,
  clearable: Boolean,
  clearIcon: {
    type: icon.iconPropType,
    default: iconsVue.CircleClose
  },
  effect: {
    type: runtime.definePropType(String),
    default: "light"
  },
  collapseTags: Boolean,
  collapseTagsTooltip: {
    type: Boolean,
    default: false
  },
  maxCollapseTags: {
    type: Number,
    default: 1
  },
  defaultFirstOption: Boolean,
  disabled: Boolean,
  estimatedOptionHeight: {
    type: Number,
    default: void 0
  },
  filterable: Boolean,
  filterMethod: Function,
  height: {
    type: Number,
    default: 170
  },
  itemHeight: {
    type: Number,
    default: 34
  },
  id: String,
  loading: Boolean,
  loadingText: String,
  label: String,
  modelValue: {
    type: runtime.definePropType([Array, String, Number, Boolean, Object])
  },
  multiple: Boolean,
  multipleLimit: {
    type: Number,
    default: 0
  },
  name: String,
  noDataText: String,
  noMatchText: String,
  remoteMethod: Function,
  reserveKeyword: {
    type: Boolean,
    default: true
  },
  options: {
    type: runtime.definePropType(Array),
    required: true
  },
  placeholder: {
    type: String
  },
  teleported: content.useTooltipContentProps.teleported,
  persistent: {
    type: Boolean,
    default: true
  },
  popperClass: {
    type: String,
    default: ""
  },
  popperOptions: {
    type: runtime.definePropType(Object),
    default: () => ({})
  },
  remote: Boolean,
  size: index.useSizeProp,
  props: {
    type: runtime.definePropType(Object),
    default: () => useProps.defaultProps
  },
  valueKey: {
    type: String,
    default: "value"
  },
  scrollbarAlwaysOn: {
    type: Boolean,
    default: false
  },
  validateEvent: {
    type: Boolean,
    default: true
  },
  placement: {
    type: runtime.definePropType(String),
    values: core.placements,
    default: "bottom-start"
  }
});
const OptionProps = runtime.buildProps({
  data: Array,
  disabled: Boolean,
  hovering: Boolean,
  item: {
    type: runtime.definePropType(Object),
    required: true
  },
  index: Number,
  style: Object,
  selected: Boolean,
  created: Boolean
});

exports.OptionProps = OptionProps;
exports.SelectProps = SelectProps;
//# sourceMappingURL=defaults.js.map
