import { CalendarDate, CalendarDateTime, DateFormatter, Time, ZonedDateTime, createCalendar, getDayOfWeek, getLocalTimeZone, parseDate, parseDateTime, parseZonedDateTime, toCalendar } from "@internationalized/date";

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
	if (isZonedDateTime(referenceVal)) dateValue = parseZonedDateTime(dateStr);
	else if (isCalendarDateTime(referenceVal)) dateValue = parseDateTime(dateStr);
	else dateValue = parseDate(dateStr);
	return dateValue.calendar !== referenceVal.calendar ? toCalendar(dateValue, referenceVal.calendar) : dateValue;
}
/**
* Given a `DateValue` object, convert it to a native `Date` object.
* If a timezone is provided, the date will be converted to that timezone.
* If no timezone is provided, the date will be converted to the local timezone.
*/
function toDate(dateValue, tz = getLocalTimeZone()) {
	if (isZonedDateTime(dateValue)) return dateValue.toDate();
	else return dateValue.toDate(tz);
}
function isCalendarDateTime(dateValue) {
	return dateValue instanceof CalendarDateTime;
}
function isZonedDateTime(dateValue) {
	return dateValue instanceof ZonedDateTime;
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
	/**
	* "firstDayOfWeek" is fixed to 0(Sunday) to avoid confusion regarding locales.
	* This also aligns with other date libraries, e.g., date-fns.
	*
	* #see https://github.com/unovue/reka-ui/issues/2157
	*/
	const day = getDayOfWeek(date, locale, "sun");
	if (firstDayOfWeek > day) return date.subtract({ days: day + 7 - firstDayOfWeek });
	if (firstDayOfWeek === day) return date;
	return date.subtract({ days: day - firstDayOfWeek });
}
function getNextLastDayOfWeek(date, firstDayOfWeek, locale) {
	/**
	* "firstDayOfWeek" is fixed to 0(Sunday) to avoid confusion regarding locales.
	* This also aligns with other date libraries, e.g., date-fns.
	*
	* #see https://github.com/unovue/reka-ui/issues/2157
	*/
	const day = getDayOfWeek(date, locale, "sun");
	const lastDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
	if (day === lastDayOfWeek) return date;
	if (day > lastDayOfWeek) return date.add({ days: 7 - day + lastDayOfWeek });
	return date.add({ days: lastDayOfWeek - day });
}
/**
* Check if two dates are in the same year and month.
*/
function isSameYearMonth(a, b) {
	return a.year === b.year && a.month === b.month;
}
/**
* Check if two dates are in the same year.
*/
function isSameYear(a, b) {
	return a.year === b.year;
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
/**
* Compare two dates by year and month only (ignoring day).
*/
function compareYearMonth(a, b) {
	if (a.year !== b.year) return a.year - b.year;
	return a.month - b.month;
}
/**
* Check if a date's month is between start and end (inclusive), comparing year+month only.
*/
function isMonthBetweenInclusive(date, start, end) {
	return compareYearMonth(date, start) >= 0 && compareYearMonth(date, end) <= 0;
}
/**
* Check if a date's year is between start and end (inclusive), comparing year only.
*/
function isYearBetweenInclusive(date, start, end) {
	return date.year >= start.year && date.year <= end.year;
}
/**
* Get the number of months between two dates (inclusive).
*/
function getMonthsBetween(start, end) {
	return (end.year - start.year) * 12 + (end.month - start.month) + 1;
}
/**
* Get the number of years between two dates (inclusive).
*/
function getYearsBetween(start, end) {
	return end.year - start.year + 1;
}
/**
* Check if all months between start and end are valid (not unavailable/disabled).
*/
function areAllMonthsBetweenValid(start, end, isUnavailable, isDisabled) {
	if (isUnavailable === void 0 && isDisabled === void 0) return true;
	let current = start.set({ day: 1 });
	const endMonth = end.set({ day: 1 });
	while (compareYearMonth(current, endMonth) <= 0) {
		if (isDisabled?.(current) || isUnavailable?.(current)) return false;
		current = current.add({ months: 1 });
	}
	return true;
}
/**
* Check if all years between start and end are valid (not unavailable/disabled).
*/
function areAllYearsBetweenValid(start, end, isUnavailable, isDisabled) {
	if (isUnavailable === void 0 && isDisabled === void 0) return true;
	let current = start.set({
		day: 1,
		month: 1
	});
	const endYear = end.set({
		day: 1,
		month: 1
	});
	while (current.year <= endYear.year) {
		if (isDisabled?.(current) || isUnavailable?.(current)) return false;
		current = current.add({ years: 1 });
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
	const defaultFormatter = new DateFormatter(locale);
	const calendar = createCalendar(defaultFormatter.resolvedOptions().calendar);
	if (calendarDateTimeGranularities.includes(granularity ?? "day")) return toCalendar(new CalendarDateTime(year, month, day, 0, 0, 0), calendar);
	return toCalendar(new CalendarDate(year, month, day), calendar);
}
function getDefaultTime(props) {
	const { defaultValue, defaultPlaceholder } = props;
	if (defaultValue) return defaultValue.copy();
	if (defaultPlaceholder) return defaultPlaceholder.copy();
	return new Time(0, 0, 0);
}

//#endregion
export { areAllDaysBetweenValid, areAllMonthsBetweenValid, areAllYearsBetweenValid, compareYearMonth, getDaysInMonth, getDefaultDate, getDefaultTime, getLastFirstDayOfWeek, getMonthsBetween, getNextLastDayOfWeek, getYearsBetween, hasTime, isAfter, isAfterOrSame, isBefore, isBeforeOrSame, isBetween, isBetweenInclusive, isCalendarDateTime, isMonthBetweenInclusive, isSameYear, isSameYearMonth, isYearBetweenInclusive, isZonedDateTime, parseStringToDateValue, toDate };
//# sourceMappingURL=comparators.js.map