const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_date_comparators = require('./comparators.cjs');
const require_date_utils = require('./utils.cjs');
const __internationalized_date = require_rolldown_runtime.__toESM(require("@internationalized/date"));

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
	const daysInMonth = require_date_comparators.getDaysInMonth(dateObj);
	const datesArray = Array.from({ length: daysInMonth }, (_, i) => dateObj.set({ day: i + 1 }));
	const firstDayOfMonth = (0, __internationalized_date.startOfMonth)(dateObj);
	const lastDayOfMonth = (0, __internationalized_date.endOfMonth)(dateObj);
	const lastSunday = require_date_comparators.getLastFirstDayOfWeek(firstDayOfMonth, weekStartsOn, locale);
	const nextSaturday = require_date_comparators.getNextLastDayOfWeek(lastDayOfMonth, weekStartsOn, locale);
	const lastMonthDays = getDaysBetween(lastSunday.subtract({ days: 1 }), firstDayOfMonth);
	const nextMonthDays = getDaysBetween(lastDayOfMonth, nextSaturday.add({ days: 1 }));
	const totalDays = lastMonthDays.length + datesArray.length + nextMonthDays.length;
	if (fixedWeeks && totalDays < 42) {
		const extraDays = 42 - totalDays;
		let startFrom = nextMonthDays[nextMonthDays.length - 1];
		if (!startFrom) startFrom = (0, __internationalized_date.endOfMonth)(dateObj);
		const extraDaysArray = Array.from({ length: extraDays }, (_, i) => {
			const incr = i + 1;
			return startFrom.add({ days: incr });
		});
		nextMonthDays.push(...extraDaysArray);
	}
	const allDays = lastMonthDays.concat(datesArray, nextMonthDays);
	const weeks = require_date_utils.chunk(allDays, 7);
	return {
		value: dateObj,
		cells: allDays,
		rows: weeks
	};
}
function startOfDecade(dateObj) {
	return (0, __internationalized_date.startOfYear)(dateObj.subtract({ years: dateObj.year - Math.floor(dateObj.year / 10) * 10 }).set({
		day: 1,
		month: 1
	}));
}
function endOfDecade(dateObj) {
	return (0, __internationalized_date.endOfYear)(dateObj.add({ years: Math.ceil((dateObj.year + 1) / 10) * 10 - dateObj.year - 1 }).set({
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
		const monthsArray$1 = Array.from({ length: Math.floor(12 / numberOfMonths) }, (_, i) => (0, __internationalized_date.startOfMonth)(dateObj.set({ month: i * numberOfMonths + 1 })));
		return monthsArray$1;
	}
	const monthsArray = Array.from({ length: 12 }, (_, i) => (0, __internationalized_date.startOfMonth)(dateObj.set({ month: i + 1 })));
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
/**
* Creates a 3x4 grid of months for a given year.
*/
function createMonthGrid(props) {
	const { dateObj } = props;
	const months = createYear({ dateObj });
	return {
		value: dateObj,
		cells: months,
		rows: require_date_utils.chunk(months, 4)
	};
}
/**
* Creates a 3x4 grid of years (decade-aligned).
* The grid starts from the decade that contains the given date.
*/
function createYearGrid(props) {
	const { dateObj, yearsPerPage = 12, decadeAligned = true } = props;
	let startYear;
	if (decadeAligned) startYear = startOfDecade(dateObj).year;
	else startYear = dateObj.year;
	const years = Array.from({ length: yearsPerPage }, (_, i) => (0, __internationalized_date.startOfYear)(dateObj.set({ year: startYear + i })));
	const firstYear = years[0];
	return {
		value: firstYear,
		cells: years,
		rows: require_date_utils.chunk(years, 4)
	};
}
function createYearRange({ start, end }) {
	const years = [];
	if (!start || !end) return years;
	let current = (0, __internationalized_date.startOfYear)(start);
	while (current.compare(end) <= 0) {
		years.push(current);
		current = (0, __internationalized_date.startOfYear)(current.add({ years: 1 }));
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
* It's better to use `getWeekStart` from `@internationalized/date`,
* but sadly it is not yet exported from the package.
* And the `Intl.Locale` API is not supported well enough yet.
*/
function getWeekStartsOn(locale) {
	const monday = new __internationalized_date.CalendarDate(2025, 1, 6);
	const dayOfWeek = (0, __internationalized_date.getDayOfWeek)(monday, locale);
	return (1 - dayOfWeek + 7) % 7;
}
/**
* Returns the locale-specific week number
*/
function getWeekNumber(date, locale = "en-US", firstDayOfWeek) {
	const jan1 = new __internationalized_date.CalendarDate(date.year, 1, 1);
	const usesISOWeek = jan1.toDate("UTC").getUTCDay() !== (0, __internationalized_date.getDayOfWeek)(jan1, locale);
	const weekStartsOn = firstDayOfWeek ?? (usesISOWeek ? "mon" : "sun");
	const firstWeekContainsDate = usesISOWeek ? 4 : 1;
	const dayOfWeek = (0, __internationalized_date.getDayOfWeek)(date, locale, weekStartsOn);
	const decidingDay = date.add({ days: 7 - firstWeekContainsDate - dayOfWeek });
	const weekYear = decidingDay.year;
	const week1Ref = new __internationalized_date.CalendarDate(weekYear, 1, firstWeekContainsDate);
	const week1Start = (0, __internationalized_date.startOfWeek)(week1Ref, locale, weekStartsOn);
	const currentWeekStart = (0, __internationalized_date.startOfWeek)(date, locale, weekStartsOn);
	const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1e3;
	const daysDiff = Math.round((currentWeekStart.toDate("UTC").getTime() - week1Start.toDate("UTC").getTime()) / MS_PER_WEEK);
	return daysDiff + 1;
}

//#endregion
Object.defineProperty(exports, 'createDateRange', {
  enumerable: true,
  get: function () {
    return createDateRange;
  }
});
Object.defineProperty(exports, 'createDecade', {
  enumerable: true,
  get: function () {
    return createDecade;
  }
});
Object.defineProperty(exports, 'createMonth', {
  enumerable: true,
  get: function () {
    return createMonth;
  }
});
Object.defineProperty(exports, 'createMonthGrid', {
  enumerable: true,
  get: function () {
    return createMonthGrid;
  }
});
Object.defineProperty(exports, 'createMonths', {
  enumerable: true,
  get: function () {
    return createMonths;
  }
});
Object.defineProperty(exports, 'createYear', {
  enumerable: true,
  get: function () {
    return createYear;
  }
});
Object.defineProperty(exports, 'createYearGrid', {
  enumerable: true,
  get: function () {
    return createYearGrid;
  }
});
Object.defineProperty(exports, 'createYearRange', {
  enumerable: true,
  get: function () {
    return createYearRange;
  }
});
Object.defineProperty(exports, 'endOfDecade', {
  enumerable: true,
  get: function () {
    return endOfDecade;
  }
});
Object.defineProperty(exports, 'getDaysBetween', {
  enumerable: true,
  get: function () {
    return getDaysBetween;
  }
});
Object.defineProperty(exports, 'getWeekNumber', {
  enumerable: true,
  get: function () {
    return getWeekNumber;
  }
});
Object.defineProperty(exports, 'getWeekStartsOn', {
  enumerable: true,
  get: function () {
    return getWeekStartsOn;
  }
});
Object.defineProperty(exports, 'startOfDecade', {
  enumerable: true,
  get: function () {
    return startOfDecade;
  }
});
//# sourceMappingURL=calendar.cjs.map