import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import { isArray, isDate } from '@vue/shared';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { UPDATE_MODEL_EVENT, INPUT_EVENT } from '../../../constants/event.mjs';

const isValidRange = (range) => isArray(range) && range.length === 2 && range.every((item) => isDate(item));
const calendarProps = buildProps({
  modelValue: {
    type: Date
  },
  range: {
    type: definePropType(Array),
    validator: isValidRange
  }
});
const calendarEmits = {
  [UPDATE_MODEL_EVENT]: (value) => isDate(value),
  [INPUT_EVENT]: (value) => isDate(value)
};

export { calendarEmits, calendarProps };
//# sourceMappingURL=calendar.mjs.map
