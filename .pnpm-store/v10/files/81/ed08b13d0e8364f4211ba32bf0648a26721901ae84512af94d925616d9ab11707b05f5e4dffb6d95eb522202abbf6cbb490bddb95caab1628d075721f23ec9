const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_date_comparators = require('../date/comparators.cjs');
const require_date_calendar = require('../date/calendar.cjs');
const require_shared_useDateFormatter = require('../shared/useDateFormatter.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __internationalized_date = require_rolldown_runtime.__toESM(require("@internationalized/date"));

//#region src/YearPicker/useYearPicker.ts
function useYearPickerState(props) {
	function isYearSelected(dateObj) {
		if (Array.isArray(props.date.value)) return props.date.value.some((d) => require_date_comparators.isSameYear(d, dateObj));
		else if (!props.date.value) return false;
		else return require_date_comparators.isSameYear(props.date.value, dateObj);
	}
	const isInvalid = (0, vue.computed)(() => {
		if (Array.isArray(props.date.value)) {
			if (!props.date.value.length) return false;
			for (const dateObj of props.date.value) {
				if (props.isYearDisabled?.(dateObj)) return true;
				if (props.isYearUnavailable?.(dateObj)) return true;
			}
		} else {
			if (!props.date.value) return false;
			if (props.isYearDisabled?.(props.date.value)) return true;
			if (props.isYearUnavailable?.(props.date.value)) return true;
		}
		return false;
	});
	return {
		isYearSelected,
		isInvalid
	};
}
function useYearPicker(props) {
	const formatter = require_shared_useDateFormatter.useDateFormatter(props.locale.value);
	const resolveMatcher = (matcher) => typeof matcher === "function" ? matcher : matcher?.value;
	const headingFormatOptions = (0, vue.computed)(() => {
		const options = { calendar: props.placeholder.value.calendar.identifier };
		if (props.placeholder.value.calendar.identifier === "gregory" && props.placeholder.value.era === "BC") options.era = "short";
		return options;
	});
	const grid = (0, vue.ref)(require_date_calendar.createYearGrid({
		dateObj: props.placeholder.value,
		yearsPerPage: props.yearsPerPage.value
	}));
	function isYearDisabled(dateObj) {
		if (resolveMatcher(props.isYearDisabled)?.(dateObj) || props.disabled.value) return true;
		if (props.maxValue.value && require_date_comparators.isAfter((0, __internationalized_date.startOfYear)(dateObj), props.maxValue.value)) return true;
		if (props.minValue.value && require_date_comparators.isBefore((0, __internationalized_date.endOfYear)(dateObj), props.minValue.value)) return true;
		return false;
	}
	const isYearUnavailable = (date) => {
		if (resolveMatcher(props.isYearUnavailable)?.(date)) return true;
		return false;
	};
	const isNextButtonDisabled = (nextPageFunc) => {
		if (!props.maxValue.value) return false;
		if (props.disabled.value) return true;
		const lastYearInView = grid.value.cells[grid.value.cells.length - 1];
		if (nextPageFunc || props.nextPage.value) {
			const nextDate = (nextPageFunc || props.nextPage.value)(lastYearInView);
			return require_date_comparators.isAfter((0, __internationalized_date.startOfYear)(nextDate), props.maxValue.value);
		}
		const nextPageStart = (0, __internationalized_date.startOfYear)(lastYearInView.add({ years: 1 }));
		return require_date_comparators.isAfter(nextPageStart, props.maxValue.value);
	};
	const isPrevButtonDisabled = (prevPageFunc) => {
		if (!props.minValue.value) return false;
		if (props.disabled.value) return true;
		const firstYearInView = grid.value.value;
		if (prevPageFunc || props.prevPage.value) {
			const prevDate = (prevPageFunc || props.prevPage.value)(firstYearInView);
			return require_date_comparators.isBefore((0, __internationalized_date.endOfYear)(prevDate), props.minValue.value);
		}
		const prevPageEnd = (0, __internationalized_date.endOfYear)(firstYearInView.subtract({ years: 1 }));
		return require_date_comparators.isBefore(prevPageEnd, props.minValue.value);
	};
	const nextPage = (nextPageFunc) => {
		const firstYearInGrid = grid.value.value;
		if (nextPageFunc || props.nextPage.value) {
			const newDate$1 = (nextPageFunc || props.nextPage.value)(firstYearInGrid);
			grid.value = require_date_calendar.createYearGrid({
				dateObj: newDate$1,
				yearsPerPage: props.yearsPerPage.value,
				decadeAligned: false
			});
			props.placeholder.value = newDate$1.set({
				month: 1,
				day: 1
			});
			return;
		}
		const newDate = firstYearInGrid.add({ years: props.yearsPerPage.value });
		grid.value = require_date_calendar.createYearGrid({
			dateObj: newDate,
			yearsPerPage: props.yearsPerPage.value,
			decadeAligned: false
		});
		props.placeholder.value = newDate.set({
			month: 1,
			day: 1
		});
	};
	const prevPage = (prevPageFunc) => {
		const firstYearInGrid = grid.value.value;
		if (prevPageFunc || props.prevPage.value) {
			const newDate$1 = (prevPageFunc || props.prevPage.value)(firstYearInGrid);
			grid.value = require_date_calendar.createYearGrid({
				dateObj: newDate$1,
				yearsPerPage: props.yearsPerPage.value,
				decadeAligned: false
			});
			props.placeholder.value = newDate$1.set({
				month: 1,
				day: 1
			});
			return;
		}
		const newDate = firstYearInGrid.subtract({ years: props.yearsPerPage.value });
		grid.value = require_date_calendar.createYearGrid({
			dateObj: newDate,
			yearsPerPage: props.yearsPerPage.value,
			decadeAligned: false
		});
		props.placeholder.value = newDate.set({
			month: 1,
			day: 1
		});
	};
	(0, vue.watch)(props.placeholder, (value) => {
		const firstYearInGrid = grid.value.value;
		const lastYearInGrid = grid.value.cells[grid.value.cells.length - 1];
		if (value.year >= firstYearInGrid.year && value.year <= lastYearInGrid.year) return;
		grid.value = require_date_calendar.createYearGrid({
			dateObj: value,
			yearsPerPage: props.yearsPerPage.value
		});
	});
	(0, vue.watch)([props.locale, props.yearsPerPage], () => {
		formatter.setLocale(props.locale.value);
		grid.value = require_date_calendar.createYearGrid({
			dateObj: props.placeholder.value,
			yearsPerPage: props.yearsPerPage.value
		});
	});
	const headingValue = (0, vue.computed)(() => {
		if (props.locale.value !== formatter.getLocale()) formatter.setLocale(props.locale.value);
		const firstYear = grid.value.cells[0];
		const lastYear = grid.value.cells[grid.value.cells.length - 1];
		return `${formatter.fullYear(require_date_comparators.toDate(firstYear), headingFormatOptions.value)} - ${formatter.fullYear(require_date_comparators.toDate(lastYear), headingFormatOptions.value)}`;
	});
	const fullCalendarLabel = (0, vue.computed)(() => `${props.calendarLabel.value ?? "Year Picker"}, ${headingValue.value}`);
	return {
		isYearDisabled,
		isYearUnavailable,
		isNextButtonDisabled,
		isPrevButtonDisabled,
		grid,
		formatter,
		nextPage,
		prevPage,
		headingValue,
		fullCalendarLabel
	};
}

//#endregion
Object.defineProperty(exports, 'useYearPicker', {
  enumerable: true,
  get: function () {
    return useYearPicker;
  }
});
Object.defineProperty(exports, 'useYearPickerState', {
  enumerable: true,
  get: function () {
    return useYearPickerState;
  }
});
//# sourceMappingURL=useYearPicker.cjs.map