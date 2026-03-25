import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { CHANGE_EVENT } from '../../../constants/event.mjs';
import { isNumber } from '../../../utils/types.mjs';

const countdownProps = buildProps({
  format: {
    type: String,
    default: "HH:mm:ss"
  },
  prefix: String,
  suffix: String,
  title: String,
  value: {
    type: definePropType([Number, Object]),
    default: 0
  },
  valueStyle: {
    type: definePropType([String, Object, Array])
  }
});
const countdownEmits = {
  finish: () => true,
  [CHANGE_EVENT]: (value) => isNumber(value)
};

export { countdownEmits, countdownProps };
//# sourceMappingURL=countdown.mjs.map
