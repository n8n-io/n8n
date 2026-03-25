'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var dayjs = require('dayjs');
require('../../../utils/index.js');
var shared = require('@vue/shared');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var dayjs__default = /*#__PURE__*/_interopDefaultLegacy(dayjs);

const isValidRange = (range) => {
  if (!shared.isArray(range))
    return false;
  const [left, right] = range;
  return dayjs__default["default"].isDayjs(left) && dayjs__default["default"].isDayjs(right) && left.isSameOrBefore(right);
};
const getDefaultValue = (defaultValue, { lang, unit, unlinkPanels }) => {
  let start;
  if (shared.isArray(defaultValue)) {
    let [left, right] = defaultValue.map((d) => dayjs__default["default"](d).locale(lang));
    if (!unlinkPanels) {
      right = left.add(1, unit);
    }
    return [left, right];
  } else if (defaultValue) {
    start = dayjs__default["default"](defaultValue);
  } else {
    start = dayjs__default["default"]();
  }
  start = start.locale(lang);
  return [start, start.add(1, unit)];
};
const buildPickerTable = (dimension, rows, {
  columnIndexOffset,
  startDate,
  nextEndDate,
  now,
  unit,
  relativeDateGetter,
  setCellMetadata,
  setRowMetadata
}) => {
  for (let rowIndex = 0; rowIndex < dimension.row; rowIndex++) {
    const row = rows[rowIndex];
    for (let columnIndex = 0; columnIndex < dimension.column; columnIndex++) {
      let cell = row[columnIndex + columnIndexOffset];
      if (!cell) {
        cell = {
          row: rowIndex,
          column: columnIndex,
          type: "normal",
          inRange: false,
          start: false,
          end: false
        };
      }
      const index = rowIndex * dimension.column + columnIndex;
      const nextStartDate = relativeDateGetter(index);
      cell.dayjs = nextStartDate;
      cell.date = nextStartDate.toDate();
      cell.timestamp = nextStartDate.valueOf();
      cell.type = "normal";
      cell.inRange = !!(startDate && nextStartDate.isSameOrAfter(startDate, unit) && nextEndDate && nextStartDate.isSameOrBefore(nextEndDate, unit)) || !!(startDate && nextStartDate.isSameOrBefore(startDate, unit) && nextEndDate && nextStartDate.isSameOrAfter(nextEndDate, unit));
      if (startDate == null ? void 0 : startDate.isSameOrAfter(nextEndDate)) {
        cell.start = !!nextEndDate && nextStartDate.isSame(nextEndDate, unit);
        cell.end = startDate && nextStartDate.isSame(startDate, unit);
      } else {
        cell.start = !!startDate && nextStartDate.isSame(startDate, unit);
        cell.end = !!nextEndDate && nextStartDate.isSame(nextEndDate, unit);
      }
      const isToday = nextStartDate.isSame(now, unit);
      if (isToday) {
        cell.type = "today";
      }
      setCellMetadata == null ? void 0 : setCellMetadata(cell, { rowIndex, columnIndex });
      row[columnIndex + columnIndexOffset] = cell;
    }
    setRowMetadata == null ? void 0 : setRowMetadata(row);
  }
};

exports.buildPickerTable = buildPickerTable;
exports.getDefaultValue = getDefaultValue;
exports.isValidRange = isValidRange;
//# sourceMappingURL=utils.js.map
