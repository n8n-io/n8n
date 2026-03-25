import { ref, computed, unref, watch, nextTick } from 'vue';
import dayjs from 'dayjs';
import { flatten } from 'lodash-unified';
import '../../../../hooks/index.mjs';
import '../../../../utils/index.mjs';
import { buildPickerTable } from '../utils.mjs';
import { useLocale } from '../../../../hooks/use-locale/index.mjs';
import { castArray } from '../../../../utils/arrays.mjs';
import { useNamespace } from '../../../../hooks/use-namespace/index.mjs';

const isNormalDay = (type = "") => {
  return ["normal", "today"].includes(type);
};
const useBasicDateTable = (props, emit) => {
  const { lang } = useLocale();
  const tbodyRef = ref();
  const currentCellRef = ref();
  const lastRow = ref();
  const lastColumn = ref();
  const tableRows = ref([[], [], [], [], [], []]);
  let focusWithClick = false;
  const firstDayOfWeek = props.date.$locale().weekStart || 7;
  const WEEKS_CONSTANT = props.date.locale("en").localeData().weekdaysShort().map((_) => _.toLowerCase());
  const offsetDay = computed(() => {
    return firstDayOfWeek > 3 ? 7 - firstDayOfWeek : -firstDayOfWeek;
  });
  const startDate = computed(() => {
    const startDayOfMonth = props.date.startOf("month");
    return startDayOfMonth.subtract(startDayOfMonth.day() || 7, "day");
  });
  const WEEKS = computed(() => {
    return WEEKS_CONSTANT.concat(WEEKS_CONSTANT).slice(firstDayOfWeek, firstDayOfWeek + 7);
  });
  const hasCurrent = computed(() => {
    return flatten(unref(rows)).some((row) => {
      return row.isCurrent;
    });
  });
  const days = computed(() => {
    const startOfMonth = props.date.startOf("month");
    const startOfMonthDay = startOfMonth.day() || 7;
    const dateCountOfMonth = startOfMonth.daysInMonth();
    const dateCountOfLastMonth = startOfMonth.subtract(1, "month").daysInMonth();
    return {
      startOfMonthDay,
      dateCountOfMonth,
      dateCountOfLastMonth
    };
  });
  const selectedDate = computed(() => {
    return props.selectionMode === "dates" ? castArray(props.parsedValue) : [];
  });
  const setDateText = (cell, { count, rowIndex, columnIndex }) => {
    const { startOfMonthDay, dateCountOfMonth, dateCountOfLastMonth } = unref(days);
    const offset = unref(offsetDay);
    if (rowIndex >= 0 && rowIndex <= 1) {
      const numberOfDaysFromPreviousMonth = startOfMonthDay + offset < 0 ? 7 + startOfMonthDay + offset : startOfMonthDay + offset;
      if (columnIndex + rowIndex * 7 >= numberOfDaysFromPreviousMonth) {
        cell.text = count;
        return true;
      } else {
        cell.text = dateCountOfLastMonth - (numberOfDaysFromPreviousMonth - columnIndex % 7) + 1 + rowIndex * 7;
        cell.type = "prev-month";
      }
    } else {
      if (count <= dateCountOfMonth) {
        cell.text = count;
      } else {
        cell.text = count - dateCountOfMonth;
        cell.type = "next-month";
      }
      return true;
    }
    return false;
  };
  const setCellMetadata = (cell, { columnIndex, rowIndex }, count) => {
    const { disabledDate, cellClassName } = props;
    const _selectedDate = unref(selectedDate);
    const shouldIncrement = setDateText(cell, { count, rowIndex, columnIndex });
    const cellDate = cell.dayjs.toDate();
    cell.selected = _selectedDate.find((d) => d.valueOf() === cell.dayjs.valueOf());
    cell.isSelected = !!cell.selected;
    cell.isCurrent = isCurrent(cell);
    cell.disabled = disabledDate == null ? void 0 : disabledDate(cellDate);
    cell.customClass = cellClassName == null ? void 0 : cellClassName(cellDate);
    return shouldIncrement;
  };
  const setRowMetadata = (row) => {
    if (props.selectionMode === "week") {
      const [start, end] = props.showWeekNumber ? [1, 7] : [0, 6];
      const isActive = isWeekActive(row[start + 1]);
      row[start].inRange = isActive;
      row[start].start = isActive;
      row[end].inRange = isActive;
      row[end].end = isActive;
    }
  };
  const rows = computed(() => {
    const { minDate, maxDate, rangeState, showWeekNumber } = props;
    const offset = unref(offsetDay);
    const rows_ = unref(tableRows);
    const dateUnit = "day";
    let count = 1;
    if (showWeekNumber) {
      for (let rowIndex = 0; rowIndex < 6; rowIndex++) {
        if (!rows_[rowIndex][0]) {
          rows_[rowIndex][0] = {
            type: "week",
            text: unref(startDate).add(rowIndex * 7 + 1, dateUnit).week()
          };
        }
      }
    }
    buildPickerTable({ row: 6, column: 7 }, rows_, {
      startDate: minDate,
      columnIndexOffset: showWeekNumber ? 1 : 0,
      nextEndDate: rangeState.endDate || maxDate || rangeState.selecting && minDate || null,
      now: dayjs().locale(unref(lang)).startOf(dateUnit),
      unit: dateUnit,
      relativeDateGetter: (idx) => unref(startDate).add(idx - offset, dateUnit),
      setCellMetadata: (...args) => {
        if (setCellMetadata(...args, count)) {
          count += 1;
        }
      },
      setRowMetadata
    });
    return rows_;
  });
  watch(() => props.date, async () => {
    var _a;
    if ((_a = unref(tbodyRef)) == null ? void 0 : _a.contains(document.activeElement)) {
      await nextTick();
      await focus();
    }
  });
  const focus = async () => {
    var _a;
    return (_a = unref(currentCellRef)) == null ? void 0 : _a.focus();
  };
  const isCurrent = (cell) => {
    return props.selectionMode === "date" && isNormalDay(cell.type) && cellMatchesDate(cell, props.parsedValue);
  };
  const cellMatchesDate = (cell, date) => {
    if (!date)
      return false;
    return dayjs(date).locale(unref(lang)).isSame(props.date.date(Number(cell.text)), "day");
  };
  const getDateOfCell = (row, column) => {
    const offsetFromStart = row * 7 + (column - (props.showWeekNumber ? 1 : 0)) - unref(offsetDay);
    return unref(startDate).add(offsetFromStart, "day");
  };
  const handleMouseMove = (event) => {
    var _a;
    if (!props.rangeState.selecting)
      return;
    let target = event.target;
    if (target.tagName === "SPAN") {
      target = (_a = target.parentNode) == null ? void 0 : _a.parentNode;
    }
    if (target.tagName === "DIV") {
      target = target.parentNode;
    }
    if (target.tagName !== "TD")
      return;
    const row = target.parentNode.rowIndex - 1;
    const column = target.cellIndex;
    if (unref(rows)[row][column].disabled)
      return;
    if (row !== unref(lastRow) || column !== unref(lastColumn)) {
      lastRow.value = row;
      lastColumn.value = column;
      emit("changerange", {
        selecting: true,
        endDate: getDateOfCell(row, column)
      });
    }
  };
  const isSelectedCell = (cell) => {
    return !unref(hasCurrent) && (cell == null ? void 0 : cell.text) === 1 && cell.type === "normal" || cell.isCurrent;
  };
  const handleFocus = (event) => {
    if (focusWithClick || unref(hasCurrent) || props.selectionMode !== "date")
      return;
    handlePickDate(event, true);
  };
  const handleMouseDown = (event) => {
    const target = event.target.closest("td");
    if (!target)
      return;
    focusWithClick = true;
  };
  const handleMouseUp = (event) => {
    const target = event.target.closest("td");
    if (!target)
      return;
    focusWithClick = false;
  };
  const handleRangePick = (newDate) => {
    if (!props.rangeState.selecting || !props.minDate) {
      emit("pick", { minDate: newDate, maxDate: null });
      emit("select", true);
    } else {
      if (newDate >= props.minDate) {
        emit("pick", { minDate: props.minDate, maxDate: newDate });
      } else {
        emit("pick", { minDate: newDate, maxDate: props.minDate });
      }
      emit("select", false);
    }
  };
  const handleWeekPick = (newDate) => {
    const weekNumber = newDate.week();
    const value = `${newDate.year()}w${weekNumber}`;
    emit("pick", {
      year: newDate.year(),
      week: weekNumber,
      value,
      date: newDate.startOf("week")
    });
  };
  const handleDatesPick = (newDate, selected) => {
    const newValue = selected ? castArray(props.parsedValue).filter((d) => (d == null ? void 0 : d.valueOf()) !== newDate.valueOf()) : castArray(props.parsedValue).concat([newDate]);
    emit("pick", newValue);
  };
  const handlePickDate = (event, isKeyboardMovement = false) => {
    const target = event.target.closest("td");
    if (!target)
      return;
    const row = target.parentNode.rowIndex - 1;
    const column = target.cellIndex;
    const cell = unref(rows)[row][column];
    if (cell.disabled || cell.type === "week")
      return;
    const newDate = getDateOfCell(row, column);
    switch (props.selectionMode) {
      case "range": {
        handleRangePick(newDate);
        break;
      }
      case "date": {
        emit("pick", newDate, isKeyboardMovement);
        break;
      }
      case "week": {
        handleWeekPick(newDate);
        break;
      }
      case "dates": {
        handleDatesPick(newDate, !!cell.selected);
        break;
      }
      default: {
        break;
      }
    }
  };
  const isWeekActive = (cell) => {
    if (props.selectionMode !== "week")
      return false;
    let newDate = props.date.startOf("day");
    if (cell.type === "prev-month") {
      newDate = newDate.subtract(1, "month");
    }
    if (cell.type === "next-month") {
      newDate = newDate.add(1, "month");
    }
    newDate = newDate.date(Number.parseInt(cell.text, 10));
    if (props.parsedValue && !Array.isArray(props.parsedValue)) {
      const dayOffset = (props.parsedValue.day() - firstDayOfWeek + 7) % 7 - 1;
      const weekDate = props.parsedValue.subtract(dayOffset, "day");
      return weekDate.isSame(newDate, "day");
    }
    return false;
  };
  return {
    WEEKS,
    rows,
    tbodyRef,
    currentCellRef,
    focus,
    isCurrent,
    isWeekActive,
    isSelectedCell,
    handlePickDate,
    handleMouseUp,
    handleMouseDown,
    handleMouseMove,
    handleFocus
  };
};
const useBasicDateTableDOM = (props, {
  isCurrent,
  isWeekActive
}) => {
  const ns = useNamespace("date-table");
  const { t } = useLocale();
  const tableKls = computed(() => [
    ns.b(),
    { "is-week-mode": props.selectionMode === "week" }
  ]);
  const tableLabel = computed(() => t("el.datepicker.dateTablePrompt"));
  const weekLabel = computed(() => t("el.datepicker.week"));
  const getCellClasses = (cell) => {
    const classes = [];
    if (isNormalDay(cell.type) && !cell.disabled) {
      classes.push("available");
      if (cell.type === "today") {
        classes.push("today");
      }
    } else {
      classes.push(cell.type);
    }
    if (isCurrent(cell)) {
      classes.push("current");
    }
    if (cell.inRange && (isNormalDay(cell.type) || props.selectionMode === "week")) {
      classes.push("in-range");
      if (cell.start) {
        classes.push("start-date");
      }
      if (cell.end) {
        classes.push("end-date");
      }
    }
    if (cell.disabled) {
      classes.push("disabled");
    }
    if (cell.selected) {
      classes.push("selected");
    }
    if (cell.customClass) {
      classes.push(cell.customClass);
    }
    return classes.join(" ");
  };
  const getRowKls = (cell) => [
    ns.e("row"),
    { current: isWeekActive(cell) }
  ];
  return {
    tableKls,
    tableLabel,
    weekLabel,
    getCellClasses,
    getRowKls,
    t
  };
};

export { useBasicDateTable, useBasicDateTableDOM };
//# sourceMappingURL=use-basic-date-table.mjs.map
