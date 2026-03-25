'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
require('../../tooltip/index.js');
require('../../dropdown/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var trigger = require('../../tooltip/src/trigger.js');
var dropdown = require('../../dropdown/src/dropdown.js');
var content = require('../../tooltip/src/content.js');
var types = require('../../../utils/types.js');

const popoverProps = runtime.buildProps({
  trigger: trigger.useTooltipTriggerProps.trigger,
  placement: dropdown.dropdownProps.placement,
  disabled: trigger.useTooltipTriggerProps.disabled,
  visible: content.useTooltipContentProps.visible,
  transition: content.useTooltipContentProps.transition,
  popperOptions: dropdown.dropdownProps.popperOptions,
  tabindex: dropdown.dropdownProps.tabindex,
  content: content.useTooltipContentProps.content,
  popperStyle: content.useTooltipContentProps.popperStyle,
  popperClass: content.useTooltipContentProps.popperClass,
  enterable: {
    ...content.useTooltipContentProps.enterable,
    default: true
  },
  effect: {
    ...content.useTooltipContentProps.effect,
    default: "light"
  },
  teleported: content.useTooltipContentProps.teleported,
  title: String,
  width: {
    type: [String, Number],
    default: 150
  },
  offset: {
    type: Number,
    default: void 0
  },
  showAfter: {
    type: Number,
    default: 0
  },
  hideAfter: {
    type: Number,
    default: 200
  },
  autoClose: {
    type: Number,
    default: 0
  },
  showArrow: {
    type: Boolean,
    default: true
  },
  persistent: {
    type: Boolean,
    default: true
  },
  "onUpdate:visible": {
    type: Function
  }
});
const popoverEmits = {
  "update:visible": (value) => types.isBoolean(value),
  "before-enter": () => true,
  "before-leave": () => true,
  "after-enter": () => true,
  "after-leave": () => true
};

exports.popoverEmits = popoverEmits;
exports.popoverProps = popoverProps;
//# sourceMappingURL=popover.js.map
