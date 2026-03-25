import '../../../constants/index.mjs';
import '../../../utils/index.mjs';
import { buildProps } from '../../../utils/vue/props/runtime.mjs';
import { CHANGE_EVENT } from '../../../constants/event.mjs';
import { isNumber } from '../../../utils/types.mjs';

const stepsProps = buildProps({
  space: {
    type: [Number, String],
    default: ""
  },
  active: {
    type: Number,
    default: 0
  },
  direction: {
    type: String,
    default: "horizontal",
    values: ["horizontal", "vertical"]
  },
  alignCenter: {
    type: Boolean
  },
  simple: {
    type: Boolean
  },
  finishStatus: {
    type: String,
    values: ["wait", "process", "finish", "error", "success"],
    default: "finish"
  },
  processStatus: {
    type: String,
    values: ["wait", "process", "finish", "error", "success"],
    default: "process"
  }
});
const stepsEmits = {
  [CHANGE_EVENT]: (newVal, oldVal) => [newVal, oldVal].every(isNumber)
};

export { stepsEmits, stepsProps };
//# sourceMappingURL=steps.mjs.map
