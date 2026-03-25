const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const __internationalized_date = require_rolldown_runtime.__toESM(require("@internationalized/date"));

//#region src/date/comparators.ts
/**
* Given a date string and a reference `DateValue` object, parse the
* string to the same type as the reference object.
*
* Useful for parsing strings from data attributes, which are always
* strings, to the same type being used by the date component.
*/
function parseStringToDateValue(dateStr, referenceVal) {
	let dateValue;
	if (isZonedDateTime(referenceVal)) dateValue = (0, __internationalized_date.parseZonedDateTime)(dateStr);
	else if (isCalendarDateTime(referenceVal)) dateValue = (0, __internationalized_date.parseDateTime)(dateStr);
	else dateValue = (0, __internationalized_date.parseDate)(dateStr);
	return dateValue.calendar !== referenceVal.calendar ? (0, __internationalized_date.toCalendar)(dateValue, referenceVal.calendar) : dateValue;
}
/**
* Given a `DateValue` object, convert it to a native `Date` object.
* If a timezone is provided, the date will be converted to that timezone.
* If no timezone is provided, the date will be converted to the local timezone.
*/
function toDate(dateValue, tz = (0, __internationalized_date.getLocalTimeZone)()) {
	if (isZonedDateTime(dateValue)) return dateValue.toDate();
	else return dateValue.toDate(tz);
}
function isCalendarDateTime(dateValue) {
	return dateValue instanceof __internationalized_date.CalendarDateTime;
}
function isZonedDateTime(dateValue) {
	return dateValue instanceof __internationalized_date.ZonedDateTime;
}
function hasTime(dateValue) {
	return isCalendarDateTime(dateValue) || isZonedDateTime(dateValue);
}
/**
* Given a date, return the number of days in the month.
*/
function getDaysInMonth(date) {
	if (date instanceof Date) {
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		/**
		* By using zero as the day, we get the
		* last day of the previous month, which
		* is the month we originally passed in.
		*/
		return new Date(year, month, 0).getDate();
	} else return date.set({ day: 100 }).day;
}
/**
* Determine if a date is before the reference date.
* @param dateToCompare - is this date before the `referenceDate`
* @param referenceDate - is the `dateToCompare` before this date
*
* @see {@link isBeforeOrSame} for inclusive
*/
function isBefore(dateToCompare, referenceDate) {
	return dateToCompare.compare(referenceDate) < 0;
}
/**
* Determine if a date is after the reference date.
* @param dateToCompare - is this date after the `referenceDate`
* @param referenceDate - is the `dateToCompare` after this date
*
* @see {@link isAfterOrSame} for inclusive
*/
function isAfter(dateToCompare, referenceDate) {
	return dateToCompare.compare(referenceDate) > 0;
}
/**
* Determine if a date is before or the same as the reference date.
*
* @param dateToCompare - the date to compare
* @param referenceDate - the reference date to make the comparison against
*
* @see {@link isBefore} for non-inclusive
*/
function isBeforeOrSame(dateToCompare, referenceDate) {
	return dateToCompare.compare(referenceDate) <= 0;
}
/**
* Determine if a date is after or the same as the reference date.
*
* @param dateToCompare - is this date after or the same as the `referenceDate`
* @param referenceDate - is the `dateToCompare` after or the same as this date
*
* @see {@link isAfter} for non-inclusive
*/
function isAfterOrSame(dateToCompare, referenceDate) {
	return dateToCompare.compare(referenceDate) >= 0;
}
/**
* Determine if a date is inclusively between a start and end reference date.
*
* @param date - is this date inclusively between the `start` and `end` dates
* @param start - the start reference date to make the comparison against
* @param end - the end reference date to make the comparison against
*
* @see {@link isBetween} for non-inclusive
*/
function isBetweenInclusive(date, start, end) {
	return isAfterOrSame(date, start) && isBeforeOrSame(date, end);
}
/**
* Determine if a date is between a start and end reference date.
*
* @param date - is this date between the `start` and `end` dates
* @param start - the start reference date to make the comparison against
* @param end - the end reference date to make the comparison against
*
* @see {@link isBetweenInclusive} for inclusive
*/
function isBetween(date, start, end) {
	return isAfter(date, start) && isBefore(date, end);
}
function getLastFirstDayOfWeek(date, firstDayOfWeek, locale) {
	const day = (0, __internationalized_date.getDayOfWeek)(date, locale);
	if (firstDayOfWeek > day) return date.subtract({ days: day + 7 - firstDayOfWeek });
	if (firstDayOfWeek === day) return date;
	return date.subtract({ days: day - firstDayOfWeek });
}
function getNextLastDayOfWeek(date, firstDayOfWeek, locale) {
	const day = (0, __internationalized_date.getDayOfWeek)(date, locale);
	const lastDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
	if (day === lastDayOfWeek) return date;
	if (day > lastDayOfWeek) return date.add({ days: 7 - day + lastDayOfWeek });
	return date.add({ days: lastDayOfWeek - day });
}
function areAllDaysBetweenValid(start, end, isUnavailable, isDisabled, isHighlightable) {
	if (isUnavailable === void 0 && isDisabled === void 0 && isHighlightable === void 0) return true;
	let dCurrent = start.add({ days: 1 });
	if ((isDisabled?.(dCurrent) || isUnavailable?.(dCurrent)) && !isHighlightable?.(dCurrent)) return false;
	const dEnd = end;
	while (dCurrent.compare(dEnd) < 0) {
		dCurrent = dCurrent.add({ days: 1 });
		if ((isDisabled?.(dCurrent) || isUnavailable?.(dCurrent)) && !isHighlightable?.(dCurrent)) return false;
	}
	return true;
}

//#endregion
//#region src/shared/date/comparators.ts
/**
* A helper function used throughout the various date builders
* to generate a default `DateValue` using the `defaultValue`,
* `defaultPlaceholder`, and `granularity` props.
*
* It's important to match the `DateValue` type being used
* elsewhere in the builder, so they behave according to the
* behavior the user expects based on the props they've provided.
*
*/
function getDefaultDate(props) {
	const { defaultValue, defaultPlaceholder, granularity = "day", locale = "en" } = props;
	if (Array.isArray(defaultValue) && defaultValue.length) return defaultValue.at(-1).copy();
	if (defaultValue && !Array.isArray(defaultValue)) return defaultValue.copy();
	if (defaultPlaceholder) return defaultPlaceholder.copy();
	const date = /* @__PURE__ */ new Date();
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const calendarDateTimeGranularities = [
		"hour",
		"minute",
		"second"
	];
	const defaultFormatter = new __internationalized_date.DateFormatter(locale);
	const calendar = (0, __internationalized_date.createCalendar)(defaultFormatter.resolvedOptions().calendar);
	if (calendarDateTimeGranularities.includes(granularity ?? "day")) return (0, __internationalized_date.toCalendar)(new __internationalized_date.CalendarDateTime(year, month, day, 0, 0, 0), calendar);
	return (0, __internationalized_date.toCalendar)(new __internationalized_date.CalendarDate(year, month, day), calendar);
}
function getDefaultTime(props) {
	const { defaultValue, defaultPlaceholder } = props;
	if (defaultValue) return defaultValue.copy();
	if (defaultPlaceholder) return defaultPlaceholder.copy();
	return new __internationalized_date.Time(0, 0, 0);
}

//#endregion
Object.defineProperty(exports, 'areAllDaysBetweenValid', {
  enumerable: true,
  get: function () {
    return areAllDaysBetweenValid;
  }
});
Object.defineProperty(exports, 'getDaysInMonth', {
  enumerable: true,
  get: function () {
    return getDaysInMonth;
  }
});
Object.defineProperty(exports, 'getDefaultDate', {
  enumerable: true,
  get: function () {
    return getDefaultDate;
  }
});
Object.defineProperty(exports, 'getDefaultTime', {
  enumerable: true,
  get: function () {
    return getDefaultTime;
  }
});
Object.defineProperty(exports, 'getLastFirstDayOfWeek', {
  enumerable: true,
  get: function () {
    return getLastFirstDayOfWeek;
  }
});
Object.defineProperty(exports, 'getNextLastDayOfWeek', {
  enumerable: true,
  get: function () {
    return getNextLastDayOfWeek;
  }
});
Object.defineProperty(exports, 'hasTime', {
  enumerable: true,
  get: function () {
    return hasTime;
  }
});
Object.defineProperty(exports, 'isAfter', {
  enumerable: true,
  get: function () {
    return isAfter;
  }
});
Object.defineProperty(exports, 'isAfterOrSame', {
  enumerable: true,
  get: function () {
    return isAfterOrSame;
  }
});
Object.defineProperty(exports, 'isBefore', {
  enumerable: true,
  get: function () {
    return isBefore;
  }
});
Object.defineProperty(exports, 'isBeforeOrSame', {
  enumerable: true,
  get: function () {
    return isBeforeOrSame;
  }
});
Object.defineProperty(exports, 'isBetween', {
  enumerable: true,
  get: function () {
    return isBetween;
  }
});
Object.defineProperty(exports, 'isBetweenInclusive', {
  enumerable: true,
  get: function () {
    return isBetweenInclusive;
  }
});
Object.defineProperty(exports, 'isCalendarDateTime', {
  enumerable: true,
  get: function () {
    return isCalendarDateTime;
  }
});
Object.defineProperty(exports, 'isZonedDateTime', {
  enumerable: true,
  get: function () {
    return isZonedDateTime;
  }
});
Object.defineProperty(exports, 'parseStringToDateValue', {
  enumerable: true,
  get: function () {
    return parseStringToDateValue;
  }
});
Object.defineProperty(exports, 'toDate', {
  enumerable: true,
  get: function () {
    return toDate;
  }
});
//# sourceMappingURL=comparators.cjs.map