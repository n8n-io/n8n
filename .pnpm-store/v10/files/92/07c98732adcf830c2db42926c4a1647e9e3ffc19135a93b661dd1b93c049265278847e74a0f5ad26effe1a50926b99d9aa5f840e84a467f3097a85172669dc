import { useSlots, ref, computed } from 'vue';
import dayjs from 'dayjs';
import '../../../hooks/index.mjs';
import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import { useLocale } from '../../../hooks/use-locale/index.mjs';
import { INPUT_EVENT, UPDATE_MODEL_EVENT } from '../../../constants/event.mjs';
import { debugWarn } from '../../../utils/error.mjs';
import { useDeprecated } from '../../../hooks/use-deprecated/index.mjs';

const adjacentMonth = (start, end) => {
  const firstMonthLastDay = start.endOf("month");
  const lastMonthFirstDay = end.startOf("month");
  const isSameWeek = firstMonthLastDay.isSame(lastMonthFirstDay, "week");
  const lastMonthStartDay = isSameWeek ? lastMonthFirstDay.add(1, "week") : lastMonthFirstDay;
  return [
    [start, firstMonthLastDay],
    [lastMonthStartDay.startOf("week"), end]
  ];
};
const threeConsecutiveMonth = (start, end) => {
  const firstMonthLastDay = start.endOf("month");
  const secondMonthFirstDay = start.add(1, "month").startOf("month");
  const secondMonthStartDay = firstMonthLastDay.isSame(secondMonthFirstDay, "week") ? secondMonthFirstDay.add(1, "week") : secondMonthFirstDay;
  const secondMonthLastDay = secondMonthStartDay.endOf("month");
  const lastMonthFirstDay = end.startOf("month");
  const lastMonthStartDay = secondMonthLastDay.isSame(lastMonthFirstDay, "week") ? lastMonthFirstDay.add(1, "week") : lastMonthFirstDay;
  return [
    [start, firstMonthLastDay],
    [secondMonthStartDay.startOf("week"), secondMonthLastDay],
    [lastMonthStartDay.startOf("week"), end]
  ];
};
const useCalendar = (props, emit, componentName) => {
  const slots = useSlots();
  const { lang } = useLocale();
  const selectedDay = ref();
  const now = dayjs().locale(lang.value);
  const realSelectedDay = computed({
    get() {
      if (!props.modelValue)
        return selectedDay.value;
      return date.value;
    },
    set(val) {
      if (!val)
        return;
      selectedDay.value = val;
      const result = val.toDate();
      emit(INPUT_EVENT, result);
      emit(UPDATE_MODEL_EVENT, result);
    }
  });
  const validatedRange = computed(() => {
    if (!props.range)
      return [];
    const rangeArrDayjs = props.range.map((_) => dayjs(_).locale(lang.value));
    const [startDayjs, endDayjs] = rangeArrDayjs;
    if (startDayjs.isAfter(endDayjs)) {
      debugWarn(componentName, "end time should be greater than start time");
      return [];
    }
    if (startDayjs.isSame(endDayjs, "month")) {
      return calculateValidatedDateRange(startDayjs, endDayjs);
    } else {
      if (startDayjs.add(1, "month").month() !== endDayjs.month()) {
        debugWarn(componentName, "start time and end time interval must not exceed two months");
        return [];
      }
      return calculateValidatedDateRange(startDayjs, endDayjs);
    }
  });
  const date = computed(() => {
    if (!props.modelValue) {
      return realSelectedDay.value || (validatedRange.value.length ? validatedRange.value[0][0] : now);
    } else {
      return dayjs(props.modelValue).locale(lang.value);
    }
  });
  const prevMonthDayjs = computed(() => date.value.subtract(1, "month").date(1));
  const nextMonthDayjs = computed(() => date.value.add(1, "month").date(1));
  const prevYearDayjs = computed(() => date.value.subtract(1, "year").date(1));
  const nextYearDayjs = computed(() => date.value.add(1, "year").date(1));
  const calculateValidatedDateRange = (startDayjs, endDayjs) => {
    const firstDay = startDayjs.startOf("week");
    const lastDay = endDayjs.endOf("week");
    const firstMonth = firstDay.get("month");
    const lastMonth = lastDay.get("month");
    if (firstMonth === lastMonth) {
      return [[firstDay, lastDay]];
    } else if ((firstMonth + 1) % 12 === lastMonth) {
      return adjacentMonth(firstDay, lastDay);
    } else if (firstMonth + 2 === lastMonth || (firstMonth + 1) % 11 === lastMonth) {
      return threeConsecutiveMonth(firstDay, lastDay);
    } else {
      debugWarn(componentName, "start time and end time interval must not exceed two months");
      return [];
    }
  };
  const pickDay = (day) => {
    realSelectedDay.value = day;
  };
  const selectDate = (type) => {
    const dateMap = {
      "prev-month": prevMonthDayjs.value,
      "next-month": nextMonthDayjs.value,
      "prev-year": prevYearDayjs.value,
      "next-year": nextYearDayjs.value,
      today: now
    };
    const day = dateMap[type];
    if (!day.isSame(date.value, "day")) {
      pickDay(day);
    }
  };
  useDeprecated({
    from: '"dateCell"',
    replacement: '"date-cell"',
    scope: "ElCalendar",
    version: "2.3.0",
    ref: "https://element-plus.org/en-US/component/calendar.html#slots",
    type: "Slot"
  }, computed(() => !!slots.dateCell));
  return {
    calculateValidatedDateRange,
    date,
    realSelectedDay,
    pickDay,
    selectDate,
    validatedRange
  };
};

export { useCalendar };
//# sourceMappingURL=use-calendar.mjs.map
