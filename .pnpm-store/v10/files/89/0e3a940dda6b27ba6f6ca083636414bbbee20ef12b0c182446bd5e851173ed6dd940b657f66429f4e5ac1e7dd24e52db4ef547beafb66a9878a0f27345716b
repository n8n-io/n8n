const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_date_comparators = require('../date/comparators.cjs');
const require_date_calendar = require('../date/calendar.cjs');
const require_shared_useDateFormatter = require('../shared/useDateFormatter.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __internationalized_date = require_rolldown_runtime.__toESM(require("@internationalized/date"));

//#region src/Calendar/useCalendar.ts
function useCalendarState(props) {
	function isDateSelected(dateObj) {
		if (Array.isArray(props.date.value)) return props.date.value.some((d) => (0, __internationalized_date.isSameDay)(d, dateObj));
		else if (!props.date.value) return false;
		else return (0, __internationalized_date.isSameDay)(props.date.value, dateObj);
	}
	const isInvalid = (0, vue.computed)(() => {
		if (Array.isArray(props.date.value)) {
			if (!props.date.value.length) return false;
			for (const dateObj of props.date.value) {
				if (props.isDateDisabled?.(dateObj)) return true;
				if (props.isDateUnavailable?.(dateObj)) return true;
			}
		} else {
			if (!props.date.value) return false;
			if (props.isDateDisabled?.(props.date.value)) return true;
			if (props.isDateUnavailable?.(props.date.value)) return true;
		}
		return false;
	});
	return {
		isDateSelected,
		isInvalid
	};
}
function handleNextDisabled(lastPeriodInView, nextPageFunc) {
	const firstPeriodOfNextPage = nextPageFunc(lastPeriodInView);
	const diff = firstPeriodOfNextPage.compare(lastPeriodInView);
	const duration = {};
	if (diff >= 7) duration.day = 1;
	if (diff >= require_date_comparators.getDaysInMonth(lastPeriodInView)) duration.month = 1;
	return firstPeriodOfNextPage.set({ ...duration });
}
function handlePrevDisabled(firstPeriodInView, prevPageFunc) {
	const lastPeriodOfPrevPage = prevPageFunc(firstPeriodInView);
	const diff = firstPeriodInView.compare(lastPeriodOfPrevPage);
	const duration = {};
	if (diff >= 7) duration.day = 35;
	if (diff >= require_date_comparators.getDaysInMonth(firstPeriodInView)) duration.month = 13;
	return lastPeriodOfPrevPage.set({ ...duration });
}
function handleNextPage(date, nextPageFunc) {
	return nextPageFunc(date);
}
function handlePrevPage(date, prevPageFunc) {
	return prevPageFunc(date);
}
function useCalendar(props) {
	const formatter = require_shared_useDateFormatter.useDateFormatter(props.locale.value);
	const headingFormatOptions = (0, vue.computed)(() => {
		const options = { calendar: props.placeholder.value.calendar.identifier };
		if (props.placeholder.value.calendar.identifier === "gregory" && props.placeholder.value.era === "BC") options.era = "short";
		return options;
	});
	const grid = (0, vue.ref)(require_date_calendar.createMonths({
		dateObj: props.placeholder.value,
		weekStartsOn: props.weekStartsOn.value,
		locale: props.locale.value,
		fixedWeeks: props.fixedWeeks.value,
		numberOfMonths: props.numberOfMonths.value
	}));
	const visibleView = (0, vue.computed)(() => {
		return grid.value.map((month) => month.value);
	});
	function isOutsideVisibleView(date) {
		return !visibleView.value.some((month) => (0, __internationalized_date.isEqualMonth)(date, month));
	}
	const isNextButtonDisabled = (nextPageFunc) => {
		if (!props.maxValue.value || !grid.value.length) return false;
		if (props.disabled.value) return true;
		const lastPeriodInView = grid.value[grid.value.length - 1].value;
		if (!nextPageFunc && !props.nextPage.value) {
			const firstPeriodOfNextPage$1 = lastPeriodInView.add({ months: 1 }).set({ day: 1 });
			return require_date_comparators.isAfter(firstPeriodOfNextPage$1, props.maxValue.value);
		}
		const firstPeriodOfNextPage = handleNextDisabled(lastPeriodInView, nextPageFunc || props.nextPage.value);
		return require_date_comparators.isAfter(firstPeriodOfNextPage, props.maxValue.value);
	};
	const isPrevButtonDisabled = (prevPageFunc) => {
		if (!props.minValue.value || !grid.value.length) return false;
		if (props.disabled.value) return true;
		const firstPeriodInView = grid.value[0].value;
		if (!prevPageFunc && !props.prevPage.value) {
			const lastPeriodOfPrevPage$1 = firstPeriodInView.subtract({ months: 1 }).set({ day: 35 });
			return require_date_comparators.isBefore(lastPeriodOfPrevPage$1, props.minValue.value);
		}
		const lastPeriodOfPrevPage = handlePrevDisabled(firstPeriodInView, prevPageFunc || props.prevPage.value);
		return require_date_comparators.isBefore(lastPeriodOfPrevPage, props.minValue.value);
	};
	function isDateDisabled(dateObj) {
		if (props.isDateDisabled?.(dateObj) || props.disabled.value) return true;
		if (props.maxValue.value && require_date_comparators.isAfter(dateObj, props.maxValue.value)) return true;
		if (props.minValue.value && require_date_comparators.isBefore(dateObj, props.minValue.value)) return true;
		return false;
	}
	const isDateUnavailable = (date) => {
		if (props.isDateUnavailable?.(date)) return true;
		return false;
	};
	const weekdays = (0, vue.computed)(() => {
		if (!grid.value.length) return [];
		return grid.value[0].rows[0].map((date) => {
			return formatter.dayOfWeek(require_date_comparators.toDate(date), props.weekdayFormat.value);
		});
	});
	const nextPage = (nextPageFunc) => {
		const firstDate = grid.value[0].value;
		if (!nextPageFunc && !props.nextPage.value) {
			const newDate$1 = firstDate.add({ months: props.pagedNavigation.value ? props.numberOfMonths.value : 1 });
			const newGrid$1 = require_date_calendar.createMonths({
				dateObj: newDate$1,
				weekStartsOn: props.weekStartsOn.value,
				locale: props.locale.value,
				fixedWeeks: props.fixedWeeks.value,
				numberOfMonths: props.numberOfMonths.value
			});
			grid.value = newGrid$1;
			props.placeholder.value = newGrid$1[0].value.set({ day: 1 });
			return;
		}
		const newDate = handleNextPage(firstDate, nextPageFunc || props.nextPage.value);
		const newGrid = require_date_calendar.createMonths({
			dateObj: newDate,
			weekStartsOn: props.weekStartsOn.value,
			locale: props.locale.value,
			fixedWeeks: props.fixedWeeks.value,
			numberOfMonths: props.numberOfMonths.value
		});
		grid.value = newGrid;
		const duration = {};
		if (!nextPageFunc) {
			const diff = newGrid[0].value.compare(firstDate);
			if (diff >= require_date_comparators.getDaysInMonth(firstDate)) duration.day = 1;
			if (diff >= 365) duration.month = 1;
		}
		props.placeholder.value = newGrid[0].value.set({ ...duration });
	};
	const prevPage = (prevPageFunc) => {
		const firstDate = grid.value[0].value;
		if (!prevPageFunc && !props.prevPage.value) {
			const newDate$1 = firstDate.subtract({ months: props.pagedNavigation.value ? props.numberOfMonths.value : 1 });
			const newGrid$1 = require_date_calendar.createMonths({
				dateObj: newDate$1,
				weekStartsOn: props.weekStartsOn.value,
				locale: props.locale.value,
				fixedWeeks: props.fixedWeeks.value,
				numberOfMonths: props.numberOfMonths.value
			});
			grid.value = newGrid$1;
			props.placeholder.value = newGrid$1[0].value.set({ day: 1 });
			return;
		}
		const newDate = handlePrevPage(firstDate, prevPageFunc || props.prevPage.value);
		const newGrid = require_date_calendar.createMonths({
			dateObj: newDate,
			weekStartsOn: props.weekStartsOn.value,
			locale: props.locale.value,
			fixedWeeks: props.fixedWeeks.value,
			numberOfMonths: props.numberOfMonths.value
		});
		grid.value = newGrid;
		const duration = {};
		if (!prevPageFunc) {
			const diff = firstDate.compare(newGrid[0].value);
			if (diff >= require_date_comparators.getDaysInMonth(firstDate)) duration.day = 1;
			if (diff >= 365) duration.month = 1;
		}
		props.placeholder.value = newGrid[0].value.set({ ...duration });
	};
	(0, vue.watch)(props.placeholder, (value) => {
		if (visibleView.value.some((month) => (0, __internationalized_date.isEqualMonth)(month, value))) return;
		grid.value = require_date_calendar.createMonths({
			dateObj: value,
			weekStartsOn: props.weekStartsOn.value,
			locale: props.locale.value,
			fixedWeeks: props.fixedWeeks.value,
			numberOfMonths: props.numberOfMonths.value
		});
	});
	(0, vue.watch)([
		props.locale,
		props.weekStartsOn,
		props.fixedWeeks,
		props.numberOfMonths
	], () => {
		grid.value = require_date_calendar.createMonths({
			dateObj: props.placeholder.value,
			weekStartsOn: props.weekStartsOn.value,
			locale: props.locale.value,
			fixedWeeks: props.fixedWeeks.value,
			numberOfMonths: props.numberOfMonths.value
		});
	});
	const headingValue = (0, vue.computed)(() => {
		if (!grid.value.length) return "";
		if (props.locale.value !== formatter.getLocale()) formatter.setLocale(props.locale.value);
		if (grid.value.length === 1) {
			const month = grid.value[0].value;
			return `${formatter.fullMonthAndYear(require_date_comparators.toDate(month), headingFormatOptions.value)}`;
		}
		const startMonth = require_date_comparators.toDate(grid.value[0].value);
		const endMonth = require_date_comparators.toDate(grid.value[grid.value.length - 1].value);
		const startMonthName = formatter.fullMonth(startMonth, headingFormatOptions.value);
		const endMonthName = formatter.fullMonth(endMonth, headingFormatOptions.value);
		const startMonthYear = formatter.fullYear(startMonth, headingFormatOptions.value);
		const endMonthYear = formatter.fullYear(endMonth, headingFormatOptions.value);
		const content = startMonthYear === endMonthYear ? `${startMonthName} - ${endMonthName} ${endMonthYear}` : `${startMonthName} ${startMonthYear} - ${endMonthName} ${endMonthYear}`;
		return content;
	});
	const fullCalendarLabel = (0, vue.computed)(() => `${props.calendarLabel.value ?? "Event Date"}, ${headingValue.value}`);
	return {
		isDateDisabled,
		isDateUnavailable,
		isNextButtonDisabled,
		isPrevButtonDisabled,
		grid,
		weekdays,
		visibleView,
		isOutsideVisibleView,
		formatter,
		nextPage,
		prevPage,
		headingValue,
		fullCalendarLabel
	};
}

//#endregion
Object.defineProperty(exports, 'useCalendar', {
  enumerable: true,
  get: function () {
    return useCalendar;
  }
});
Object.defineProperty(exports, 'useCalendarState', {
  enumerable: true,
  get: function () {
    return useCalendarState;
  }
});
//# sourceMappingURL=useCalendar.cjs.map