import '../../../utils/index.mjs';
import { Clock, CircleClose } from '@element-plus/icons-vue';
import '../../../hooks/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { useSizeProp } from '../../../hooks/use-size/index.mjs';

const timeSelectProps = buildProps({
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
  size: useSizeProp,
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
    type: definePropType([String, Object]),
    default: () => Clock
  },
  clearIcon: {
    type: definePropType([String, Object]),
    default: () => CircleClose
  }
});

export { timeSelectProps };
//# sourceMappingURL=time-select.mjs.map
