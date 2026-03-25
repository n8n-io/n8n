import { isNil } from 'lodash-unified';
import '../../../hooks/index.mjs';
import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import { buildProps } from '../../../utils/vue/props/runtime.mjs';
import { useSizeProp } from '../../../hooks/use-size/index.mjs';
import { isNumber } from '../../../utils/types.mjs';
import { CHANGE_EVENT, INPUT_EVENT, UPDATE_MODEL_EVENT } from '../../../constants/event.mjs';

const inputNumberProps = buildProps({
  id: {
    type: String,
    default: void 0
  },
  step: {
    type: Number,
    default: 1
  },
  stepStrictly: Boolean,
  max: {
    type: Number,
    default: Number.POSITIVE_INFINITY
  },
  min: {
    type: Number,
    default: Number.NEGATIVE_INFINITY
  },
  modelValue: Number,
  readonly: Boolean,
  disabled: Boolean,
  size: useSizeProp,
  controls: {
    type: Boolean,
    default: true
  },
  controlsPosition: {
    type: String,
    default: "",
    values: ["", "right"]
  },
  valueOnClear: {
    type: [String, Number, null],
    validator: (val) => val === null || isNumber(val) || ["min", "max"].includes(val),
    default: null
  },
  name: String,
  label: String,
  placeholder: String,
  precision: {
    type: Number,
    validator: (val) => val >= 0 && val === Number.parseInt(`${val}`, 10)
  },
  validateEvent: {
    type: Boolean,
    default: true
  }
});
const inputNumberEmits = {
  [CHANGE_EVENT]: (cur, prev) => prev !== cur,
  blur: (e) => e instanceof FocusEvent,
  focus: (e) => e instanceof FocusEvent,
  [INPUT_EVENT]: (val) => isNumber(val) || isNil(val),
  [UPDATE_MODEL_EVENT]: (val) => isNumber(val) || isNil(val)
};

export { inputNumberEmits, inputNumberProps };
//# sourceMappingURL=input-number.mjs.map
