import '../../../utils/index.mjs';
import '../../popper/index.mjs';
import '../../../constants/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { popperTriggerProps } from '../../popper/src/trigger.mjs';
import { EVENT_CODE } from '../../../constants/aria.mjs';

const useTooltipTriggerProps = buildProps({
  ...popperTriggerProps,
  disabled: Boolean,
  trigger: {
    type: definePropType([String, Array]),
    default: "hover"
  },
  triggerKeys: {
    type: definePropType(Array),
    default: () => [EVENT_CODE.enter, EVENT_CODE.space]
  }
});

export { useTooltipTriggerProps };
//# sourceMappingURL=trigger.mjs.map
