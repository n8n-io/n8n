'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
require('../../popper/index.js');
require('../../../constants/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var trigger = require('../../popper/src/trigger.js');
var aria = require('../../../constants/aria.js');

const useTooltipTriggerProps = runtime.buildProps({
  ...trigger.popperTriggerProps,
  disabled: Boolean,
  trigger: {
    type: runtime.definePropType([String, Array]),
    default: "hover"
  },
  triggerKeys: {
    type: runtime.definePropType(Array),
    default: () => [aria.EVENT_CODE.enter, aria.EVENT_CODE.space]
  }
});

exports.useTooltipTriggerProps = useTooltipTriggerProps;
//# sourceMappingURL=trigger.js.map
