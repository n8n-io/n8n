const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_date_comparators = require('../date/comparators.cjs');
const require_date_calendar = require('../date/calendar.cjs');
const require_shared_useDateFormatter = require('../shared/useDateFormatter.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __internationalized_date = require_rolldown_runtime.__toESM(require("@internationalized/date"));

//#region src/MonthPicker/useMonthPicker.ts
function useMonthPickerState(props) {
	function isMonthSelected(dateObj) {
		if (Array.isArray(props.date.value)) return props.date.value.some((d) => require_date_comparators.isSameYearMonth(d, dateObj));
		else if (!props.date.value) return false;
		else return require_date_comparators.isSameYearMonth(props.date.value, dateObj);
	}
	const isInvalid = (0, vue.computed)(() => {
		if (Array.isArray(props.date.value)) {
			if (!props.date.value.length) return false;
			for (const dateObj of props.date.value) {
				if (props.isMonthDisabled?.(dateObj)) return true;
				if (props.isMonthUnavailable?.(dateObj)) return true;
			}
		} else {
			if (!props.date.value) return false;
			if (props.isMonthDisabled?.(props.date.value)) return true;
			if (props.isMonthUnavailable?.(props.date.value)) return true;
		}
		return false;
	});
	return {
		isMonthSelected,
		isInvalid
	};
}
function useMonthPicker(props) {
	const formatter = require_shared_useDateFormatter.useDateFormatter(props.locale.value);
	const resolveMatcher = (matcher) => typeof matcher === "function" ? matcher : matcher?.value;
	const headingFormatOptions = (0, vue.computed)(() => {
		const options = { calendar: props.placeholder.value.calendar.identifier };
		if (props.placeholder.value.calendar.identifier === "gregory" && props.placeholder.value.era === "BC") options.era = "short";
		return options;
	});
	const grid = (0, vue.ref)(require_date_calendar.createMonthGrid({ dateObj: props.placeholder.value }));
	function isMonthDisabled(dateObj) {
		if (resolveMatcher(props.isMonthDisabled)?.(dateObj) || props.disabled.value) return true;
		if (props.maxValue.value && require_date_comparators.isAfter(dateObj.set({ day: 1 }), props.maxValue.value)) return true;
		if (props.minValue.value && require_date_comparators.isBefore((0, __internationalized_date.endOfMonth)(dateObj), props.minValue.value)) return true;
		return false;
	}
	const isMonthUnavailable = (date) => {
		if (resolveMatcher(props.isMonthUnavailable)?.(date)) return true;
		return false;
	};
	const isNextButtonDisabled = (nextPageFunc) => {
		if (!props.maxValue.value) return false;
		if (props.disabled.value) return true;
		const currentDate = grid.value.value;
		if (nextPageFunc || props.nextPage.value) {
			const nextDate = (nextPageFunc || props.nextPage.value)(currentDate);
			return require_date_comparators.isAfter(nextDate.set({
				month: 1,
				day: 1
			}), props.maxValue.value);
		}
		const nextYear = currentDate.add({ years: 1 }).set({
			month: 1,
			day: 1
		});
		return require_date_comparators.isAfter(nextYear, props.maxValue.value);
	};
	const isPrevButtonDisabled = (prevPageFunc) => {
		if (!props.minValue.value) return false;
		if (props.disabled.value) return true;
		const currentDate = grid.value.value;
		if (prevPageFunc || props.prevPage.value) {
			const prevDate = (prevPageFunc || props.prevPage.value)(currentDate);
			return require_date_comparators.isBefore((0, __internationalized_date.endOfMonth)(prevDate.set({ month: 12 })), props.minValue.value);
		}
		const prevYear = currentDate.subtract({ years: 1 }).set({
			month: 12,
			day: 31
		});
		return require_date_comparators.isBefore(prevYear, props.minValue.value);
	};
	const nextPage = (nextPageFunc) => {
		const currentDate = grid.value.value;
		if (nextPageFunc || props.nextPage.value) {
			const newDate$1 = (nextPageFunc || props.nextPage.value)(currentDate);
			grid.value = require_date_calendar.createMonthGrid({ dateObj: newDate$1 });
			props.placeholder.value = newDate$1.set({ day: 1 });
			return;
		}
		const newDate = currentDate.add({ years: 1 });
		grid.value = require_date_calendar.createMonthGrid({ dateObj: newDate });
		props.placeholder.value = newDate.set({ day: 1 });
	};
	const prevPage = (prevPageFunc) => {
		const currentDate = grid.value.value;
		if (prevPageFunc || props.prevPage.value) {
			const newDate$1 = (prevPageFunc || props.prevPage.value)(currentDate);
			grid.value = require_date_calendar.createMonthGrid({ dateObj: newDate$1 });
			props.placeholder.value = newDate$1.set({ day: 1 });
			return;
		}
		const newDate = currentDate.subtract({ years: 1 });
		grid.value = require_date_calendar.createMonthGrid({ dateObj: newDate });
		props.placeholder.value = newDate.set({ day: 1 });
	};
	(0, vue.watch)(props.placeholder, (value) => {
		if (value.year === grid.value.value.year) return;
		grid.value = require_date_calendar.createMonthGrid({ dateObj: value });
	});
	(0, vue.watch)(props.locale, () => {
		formatter.setLocale(props.locale.value);
		grid.value = require_date_calendar.createMonthGrid({ dateObj: props.placeholder.value });
	});
	const headingValue = (0, vue.computed)(() => {
		if (props.locale.value !== formatter.getLocale()) formatter.setLocale(props.locale.value);
		return formatter.fullYear(require_date_comparators.toDate(grid.value.value), headingFormatOptions.value);
	});
	const fullCalendarLabel = (0, vue.computed)(() => `${props.calendarLabel.value ?? "Month Picker"}, ${headingValue.value}`);
	return {
		isMonthDisabled,
		isMonthUnavailable,
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
Object.defineProperty(exports, 'useMonthPicker', {
  enumerable: true,
  get: function () {
    return useMonthPicker;
  }
});
Object.defineProperty(exports, 'useMonthPickerState', {
  enumerable: true,
  get: function () {
    return useMonthPickerState;
  }
});
//# sourceMappingURL=useMonthPicker.cjs.map