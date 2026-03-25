import { computed } from 'vue';
import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData.js';
import '../../../hooks/index.mjs';
import '../../time-picker/index.mjs';
import '../../../constants/index.mjs';
import { getPrevMonthLastDays, getMonthDays, toNestedArr } from './date-table.mjs';
import { useLocale } from '../../../hooks/use-locale/index.mjs';
import { rangeArr } from '../../time-picker/src/utils.mjs';
import { WEEK_DAYS } from '../../../constants/date.mjs';

const useDateTable = (props, emit) => {
  dayjs.extend(localeData);
  const firstDayOfWeek = dayjs.localeData().firstDayOfWeek();
  const { t, lang } = useLocale();
  const now = dayjs().locale(lang.value);
  const isInRange = computed(() => !!props.range && !!props.range.length);
  const rows = computed(() => {
    let days = [];
    if (isInRange.value) {
      const [start, end] = props.range;
      const currentMonthRange = rangeArr(end.date() - start.date() + 1).map((index) => ({
        text: start.date() + index,
        type: "current"
      }));
      let remaining = currentMonthRange.length % 7;
      remaining = remaining === 0 ? 0 : 7 - remaining;
      const nextMonthRange = rangeArr(remaining).map((_, index) => ({
        text: index + 1,
        type: "next"
      }));
      days = currentMonthRange.concat(nextMonthRange);
    } else {
      const firstDay = props.date.startOf("month").day();
      const prevMonthDays = getPrevMonthLastDays(props.date, (firstDay - firstDayOfWeek + 7) % 7).map((day) => ({
        text: day,
        type: "prev"
      }));
      const currentMonthDays = getMonthDays(props.date).map((day) => ({
        text: day,
        type: "current"
      }));
      days = [...prevMonthDays, ...currentMonthDays];
      const remaining = 7 - (days.length % 7 || 7);
      const nextMonthDays = rangeArr(remaining).map((_, index) => ({
        text: index + 1,
        type: "next"
      }));
      days = days.concat(nextMonthDays);
    }
    return toNestedArr(days);
  });
  const weekDays = computed(() => {
    const start = firstDayOfWeek;
    if (start === 0) {
      return WEEK_DAYS.map((_) => t(`el.datepicker.weeks.${_}`));
    } else {
      return WEEK_DAYS.slice(start).concat(WEEK_DAYS.slice(0, start)).map((_) => t(`el.datepicker.weeks.${_}`));
    }
  });
  const getFormattedDate = (day, type) => {
    switch (type) {
      case "prev":
        return props.date.startOf("month").subtract(1, "month").date(day);
      case "next":
        return props.date.startOf("month").add(1, "month").date(day);
      case "current":
        return props.date.date(day);
    }
  };
  const handlePickDay = ({ text, type }) => {
    const date = getFormattedDate(text, type);
    emit("pick", date);
  };
  const getSlotData = ({ text, type }) => {
    const day = getFormattedDate(text, type);
    return {
      isSelected: day.isSame(props.selectedDay),
      type: `${type}-month`,
      day: day.format("YYYY-MM-DD"),
      date: day.toDate()
    };
  };
  return {
    now,
    isInRange,
    rows,
    weekDays,
    getFormattedDate,
    handlePickDay,
    getSlotData
  };
};

export { useDateTable };
//# sourceMappingURL=use-date-table.mjs.map
