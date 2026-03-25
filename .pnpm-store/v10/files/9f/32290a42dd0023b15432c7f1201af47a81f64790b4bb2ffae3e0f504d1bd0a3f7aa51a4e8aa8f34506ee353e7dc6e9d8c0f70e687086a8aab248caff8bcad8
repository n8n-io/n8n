import { placements } from '@popperjs/core';
import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import '../../../hooks/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { useSizeProp } from '../../../hooks/use-size/index.mjs';
import { isNumber } from '../../../utils/types.mjs';
import { isArray } from '@vue/shared';
import { UPDATE_MODEL_EVENT, INPUT_EVENT, CHANGE_EVENT } from '../../../constants/event.mjs';

const sliderProps = buildProps({
  modelValue: {
    type: definePropType([Number, Array]),
    default: 0
  },
  id: {
    type: String,
    default: void 0
  },
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: 100
  },
  step: {
    type: Number,
    default: 1
  },
  showInput: Boolean,
  showInputControls: {
    type: Boolean,
    default: true
  },
  size: useSizeProp,
  inputSize: useSizeProp,
  showStops: Boolean,
  showTooltip: {
    type: Boolean,
    default: true
  },
  formatTooltip: {
    type: definePropType(Function),
    default: void 0
  },
  disabled: Boolean,
  range: Boolean,
  vertical: Boolean,
  height: String,
  debounce: {
    type: Number,
    default: 300
  },
  label: {
    type: String,
    default: void 0
  },
  rangeStartLabel: {
    type: String,
    default: void 0
  },
  rangeEndLabel: {
    type: String,
    default: void 0
  },
  formatValueText: {
    type: definePropType(Function),
    default: void 0
  },
  tooltipClass: {
    type: String,
    default: void 0
  },
  placement: {
    type: String,
    values: placements,
    default: "top"
  },
  marks: {
    type: definePropType(Object)
  },
  validateEvent: {
    type: Boolean,
    default: true
  }
});
const isValidValue = (value) => isNumber(value) || isArray(value) && value.every(isNumber);
const sliderEmits = {
  [UPDATE_MODEL_EVENT]: isValidValue,
  [INPUT_EVENT]: isValidValue,
  [CHANGE_EVENT]: isValidValue
};

export { sliderEmits, sliderProps };
//# sourceMappingURL=slider.mjs.map
