import { getDaysInMonth, getLastFirstDayOfWeek, getNextLastDayOfWeek } from "./comparators.js";
import { chunk } from "./utils.js";
import { CalendarDate, endOfMonth, endOfYear, getDayOfWeek, startOfMonth, startOfYear } from "@internationalized/date";

//#region src/date/calendar.ts
/**
* Retrieves an array of date values representing the days between
* the provided start and end dates.
*/
function getDaysBetween(start, end) {
	const days = [];
	let dCurrent = start.add({ days: 1 });
	const dEnd = end;
	while (dCurrent.compare(dEnd) < 0) {
		days.push(dCurrent);
		dCurrent = dCurrent.add({ days: 1 });
	}
	return days;
}
function createMonth(props) {
	const { dateObj, weekStartsOn, fixedWeeks, locale } = props;
	const daysInMonth = getDaysInMonth(dateObj);
	const datesArray = Array.from({ length: daysInMonth }, (_, i) => dateObj.set({ day: i + 1 }));
	const firstDayOfMonth = startOfMonth(dateObj);
	const lastDayOfMonth = endOfMonth(dateObj);
	const lastSunday = getLastFirstDayOfWeek(firstDayOfMonth, weekStartsOn, locale);
	const nextSaturday = getNextLastDayOfWeek(lastDayOfMonth, weekStartsOn, locale);
	const lastMonthDays = getDaysBetween(lastSunday.subtract({ days: 1 }), firstDayOfMonth);
	const nextMonthDays = getDaysBetween(lastDayOfMonth, nextSaturday.add({ days: 1 }));
	const totalDays = lastMonthDays.length + datesArray.length + nextMonthDays.length;
	if (fixedWeeks && totalDays < 42) {
		const extraDays = 42 - totalDays;
		let startFrom = nextMonthDays[nextMonthDays.length - 1];
		if (!startFrom) startFrom = endOfMonth(dateObj);
		const extraDaysArray = Array.from({ length: extraDays }, (_, i) => {
			const incr = i + 1;
			return startFrom.add({ days: incr });
		});
		nextMonthDays.push(...extraDaysArray);
	}
	const allDays = lastMonthDays.concat(datesArray, nextMonthDays);
	const weeks = chunk(allDays, 7);
	return {
		value: dateObj,
		cells: allDays,
		rows: weeks
	};
}
function startOfDecade(dateObj) {
	return startOfYear(dateObj.subtract({ years: dateObj.year - Math.floor(dateObj.year / 10) * 10 }).set({
		day: 1,
		month: 1
	}));
}
function endOfDecade(dateObj) {
	return endOfYear(dateObj.add({ years: Math.ceil((dateObj.year + 1) / 10) * 10 - dateObj.year - 1 }).set({
		day: 35,
		month: 12
	}));
}
function createDecade(props) {
	const { dateObj, startIndex, endIndex } = props;
	const decadeArray = Array.from({ length: Math.abs(startIndex ?? 0) + endIndex }, (_, i) => i <= Math.abs(startIndex ?? 0) ? dateObj.subtract({ years: i }).set({
		day: 1,
		month: 1
	}) : dateObj.add({ years: i - endIndex }).set({
		day: 1,
		month: 1
	}));
	decadeArray.sort((a, b) => a.year - b.year);
	return decadeArray;
}
function createYear(props) {
	const { dateObj, numberOfMonths = 1, pagedNavigation = false } = props;
	if (numberOfMonths && pagedNavigation) {
		const monthsArray$1 = Array.from({ length: Math.floor(12 / numberOfMonths) }, (_, i) => startOfMonth(dateObj.set({ month: i * numberOfMonths + 1 })));
		return monthsArray$1;
	}
	const monthsArray = Array.from({ length: 12 }, (_, i) => startOfMonth(dateObj.set({ month: i + 1 })));
	return monthsArray;
}
function createMonths(props) {
	const { numberOfMonths, dateObj,...monthProps } = props;
	const months = [];
	if (!numberOfMonths || numberOfMonths === 1) {
		months.push(createMonth({
			...monthProps,
			dateObj
		}));
		return months;
	}
	months.push(createMonth({
		...monthProps,
		dateObj
	}));
	for (let i = 1; i < numberOfMonths; i++) {
		const nextMonth = dateObj.add({ months: i });
		months.push(createMonth({
			...monthProps,
			dateObj: nextMonth
		}));
	}
	return months;
}
function createYearRange({ start, end }) {
	const years = [];
	if (!start || !end) return years;
	let current = startOfYear(start);
	while (current.compare(end) <= 0) {
		years.push(current);
		current = startOfYear(current.add({ years: 1 }));
	}
	return years;
}
function createDateRange({ start, end }) {
	const dates = [];
	if (!start || !end) return dates;
	let current = start;
	while (current.compare(end) <= 0) {
		dates.push(current);
		current = current.add({ days: 1 });
	}
	return dates;
}
/**
* Returns the locale-specific week number
*/
function getWeekNumber(date, locale = "en-US", firstDayOfWeek) {
	const firstDayOfYear = new CalendarDate(date.year, 1, 1);
	const firstDayOfYearWeekday = getDayOfWeek(firstDayOfYear, locale, firstDayOfWeek);
	const firstWeekStart = firstDayOfYear.subtract({ days: firstDayOfYearWeekday });
	if (date.compare(firstWeekStart) < 0) {
		const prevYearDate = new CalendarDate(date.year - 1, 12, 31);
		return getWeekNumber(prevYearDate, locale, firstDayOfWeek);
	}
	const days = getDaysBetween(firstWeekStart, date);
	return Math.floor(days.length / 7) + 1;
}

//#endregion
export { createDateRange, createDecade, createMonth, createMonths, createYear, createYearRange, endOfDecade, getDaysBetween, getWeekNumber, startOfDecade };
//# sourceMappingURL=calendar.js.map