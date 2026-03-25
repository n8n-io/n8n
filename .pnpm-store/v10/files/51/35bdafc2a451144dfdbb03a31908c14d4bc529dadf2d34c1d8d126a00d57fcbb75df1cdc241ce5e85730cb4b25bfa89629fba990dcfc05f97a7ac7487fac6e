'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../cascader-panel/index.js');
require('../../../utils/index.js');
require('../../../hooks/index.js');
require('../../tooltip/index.js');
require('../../tag/index.js');
require('../../../constants/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var config = require('../../cascader-panel/src/config.js');
var index = require('../../../hooks/use-size/index.js');
var content = require('../../tooltip/src/content.js');
var tag = require('../../tag/src/tag.js');
var event = require('../../../constants/event.js');
var types = require('../../../utils/types.js');

const cascaderProps = runtime.buildProps({
  ...config.CommonProps,
  size: index.useSizeProp,
  placeholder: String,
  disabled: Boolean,
  clearable: Boolean,
  filterable: Boolean,
  filterMethod: {
    type: runtime.definePropType(Function),
    default: (node, keyword) => node.text.includes(keyword)
  },
  separator: {
    type: String,
    default: " / "
  },
  showAllLevels: {
    type: Boolean,
    default: true
  },
  collapseTags: Boolean,
  maxCollapseTags: {
    type: Number,
    default: 1
  },
  collapseTagsTooltip: {
    type: Boolean,
    default: false
  },
  debounce: {
    type: Number,
    default: 300
  },
  beforeFilter: {
    type: runtime.definePropType(Function),
    default: () => true
  },
  popperClass: {
    type: String,
    default: ""
  },
  teleported: content.useTooltipContentProps.teleported,
  tagType: { ...tag.tagProps.type, default: "info" },
  validateEvent: {
    type: Boolean,
    default: true
  }
});
const cascaderEmits = {
  [event.UPDATE_MODEL_EVENT]: (val) => !!val || val === null,
  [event.CHANGE_EVENT]: (val) => !!val || val === null,
  focus: (evt) => evt instanceof FocusEvent,
  blur: (evt) => evt instanceof FocusEvent,
  visibleChange: (val) => types.isBoolean(val),
  expandChange: (val) => !!val,
  removeTag: (val) => !!val
};

exports.cascaderEmits = cascaderEmits;
exports.cascaderProps = cascaderProps;
//# sourceMappingURL=cascader.js.map
