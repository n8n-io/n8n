'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
var root = require('./root.js');
var trigger = require('./trigger.js');
var arrow = require('./arrow.js');
var content = require('./content.js');
var runtime = require('../../../utils/vue/props/runtime.js');

const tooltipV2Props = runtime.buildProps({
  ...root.tooltipV2RootProps,
  ...arrow.tooltipV2ArrowProps,
  ...trigger.tooltipV2TriggerProps,
  ...content.tooltipV2ContentProps,
  alwaysOn: Boolean,
  fullTransition: Boolean,
  transitionProps: {
    type: runtime.definePropType(Object),
    default: null
  },
  teleported: Boolean,
  to: {
    type: runtime.definePropType(String),
    default: "body"
  }
});

exports.tooltipV2Props = tooltipV2Props;
//# sourceMappingURL=tooltip.js.map
