import { placements } from '@popperjs/core';
import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import { buildProps } from '../../../utils/vue/props/runtime.mjs';
import { UPDATE_MODEL_EVENT } from '../../../constants/event.mjs';
import { isNumber } from '../../../utils/types.mjs';

const sliderButtonProps = buildProps({
  modelValue: {
    type: Number,
    default: 0
  },
  vertical: Boolean,
  tooltipClass: String,
  placement: {
    type: String,
    values: placements,
    default: "top"
  }
});
const sliderButtonEmits = {
  [UPDATE_MODEL_EVENT]: (value) => isNumber(value)
};

export { sliderButtonEmits, sliderButtonProps };
//# sourceMappingURL=button.mjs.map
