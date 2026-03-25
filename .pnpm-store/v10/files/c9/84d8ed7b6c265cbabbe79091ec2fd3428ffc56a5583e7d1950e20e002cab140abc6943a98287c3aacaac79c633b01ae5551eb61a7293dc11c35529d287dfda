import dayjs from 'dayjs';
import '../../../utils/index.mjs';
import { isDate, isArray } from '@vue/shared';
import { isEmpty } from '../../../utils/types.mjs';

const buildTimeList = (value, bound) => {
  return [
    value > 0 ? value - 1 : void 0,
    value,
    value < bound ? value + 1 : void 0
  ];
};
const rangeArr = (n) => Array.from(Array.from({ length: n }).keys());
const extractDateFormat = (format) => {
  return format.replace(/\W?m{1,2}|\W?ZZ/g, "").replace(/\W?h{1,2}|\W?s{1,3}|\W?a/gi, "").trim();
};
const extractTimeFormat = (format) => {
  return format.replace(/\W?D{1,2}|\W?Do|\W?d{1,4}|\W?M{1,4}|\W?Y{2,4}/g, "").trim();
};
const dateEquals = function(a, b) {
  const aIsDate = isDate(a);
  const bIsDate = isDate(b);
  if (aIsDate && bIsDate) {
    return a.getTime() === b.getTime();
  }
  if (!aIsDate && !bIsDate) {
    return a === b;
  }
  return false;
};
const valueEquals = function(a, b) {
  const aIsArray = isArray(a);
  const bIsArray = isArray(b);
  if (aIsArray && bIsArray) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => dateEquals(item, b[index]));
  }
  if (!aIsArray && !bIsArray) {
    return dateEquals(a, b);
  }
  return false;
};
const parseDate = function(date, format, lang) {
  const day = isEmpty(format) || format === "x" ? dayjs(date).locale(lang) : dayjs(date, format).locale(lang);
  return day.isValid() ? day : void 0;
};
const formatter = function(date, format, lang) {
  if (isEmpty(format))
    return date;
  if (format === "x")
    return +date;
  return dayjs(date).locale(lang).format(format);
};
const makeList = (total, method) => {
  var _a;
  const arr = [];
  const disabledArr = method == null ? void 0 : method();
  for (let i = 0; i < total; i++) {
    arr.push((_a = disabledArr == null ? void 0 : disabledArr.includes(i)) != null ? _a : false);
  }
  return arr;
};

export { buildTimeList, dateEquals, extractDateFormat, extractTimeFormat, formatter, makeList, parseDate, rangeArr, valueEquals };
//# sourceMappingURL=utils.mjs.map
