'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
require('../../../hooks/index.js');
require('../../popper/index.js');
var content = require('./content.js');
var trigger = require('./trigger.js');
var index = require('../../../hooks/use-model-toggle/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var popper = require('../../popper/src/popper.js');
var arrow = require('../../popper/src/arrow.js');

const {
  useModelToggleProps: useTooltipModelToggleProps,
  useModelToggleEmits: useTooltipModelToggleEmits,
  useModelToggle: useTooltipModelToggle
} = index.createModelToggleComposable("visible");
const useTooltipProps = runtime.buildProps({
  ...popper.popperProps,
  ...useTooltipModelToggleProps,
  ...content.useTooltipContentProps,
  ...trigger.useTooltipTriggerProps,
  ...arrow.popperArrowProps,
  showArrow: {
    type: Boolean,
    default: true
  }
});
const tooltipEmits = [
  ...useTooltipModelToggleEmits,
  "before-show",
  "before-hide",
  "show",
  "hide",
  "open",
  "close"
];

exports.tooltipEmits = tooltipEmits;
exports.useTooltipModelToggle = useTooltipModelToggle;
exports.useTooltipModelToggleEmits = useTooltipModelToggleEmits;
exports.useTooltipModelToggleProps = useTooltipModelToggleProps;
exports.useTooltipProps = useTooltipProps;
//# sourceMappingURL=tooltip.js.map
