import '../../../utils/index.mjs';
import '../../time-picker/index.mjs';
import { rangeArr } from '../../time-picker/src/utils.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { isObject } from '@vue/shared';

const getPrevMonthLastDays = (date, count) => {
  const lastDay = date.subtract(1, "month").endOf("month").date();
  return rangeArr(count).map((_, index) => lastDay - (count - index - 1));
};
const getMonthDays = (date) => {
  const days = date.daysInMonth();
  return rangeArr(days).map((_, index) => index + 1);
};
const toNestedArr = (days) => rangeArr(days.length / 7).map((index) => {
  const start = index * 7;
  return days.slice(start, start + 7);
});
const dateTableProps = buildProps({
  selectedDay: {
    type: definePropType(Object)
  },
  range: {
    type: definePropType(Array)
  },
  date: {
    type: definePropType(Object),
    required: true
  },
  hideHeader: {
    type: Boolean
  }
});
const dateTableEmits = {
  pick: (value) => isObject(value)
};

export { dateTableEmits, dateTableProps, getMonthDays, getPrevMonthLastDays, toNestedArr };
//# sourceMappingURL=date-table.mjs.map
