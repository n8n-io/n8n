import { isAfter, isBefore, isSameYearMonth, toDate } from "../date/comparators.js";
import { createMonthGrid } from "../date/calendar.js";
import { useDateFormatter } from "../shared/useDateFormatter.js";
import { computed, ref, watch } from "vue";
import { endOfMonth } from "@internationalized/date";

//#region src/MonthPicker/useMonthPicker.ts
function useMonthPickerState(props) {
	function isMonthSelected(dateObj) {
		if (Array.isArray(props.date.value)) return props.date.value.some((d) => isSameYearMonth(d, dateObj));
		else if (!props.date.value) return false;
		else return isSameYearMonth(props.date.value, dateObj);
	}
	const isInvalid = computed(() => {
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
	const formatter = useDateFormatter(props.locale.value);
	const resolveMatcher = (matcher) => typeof matcher === "function" ? matcher : matcher?.value;
	const headingFormatOptions = computed(() => {
		const options = { calendar: props.placeholder.value.calendar.identifier };
		if (props.placeholder.value.calendar.identifier === "gregory" && props.placeholder.value.era === "BC") options.era = "short";
		return options;
	});
	const grid = ref(createMonthGrid({ dateObj: props.placeholder.value }));
	function isMonthDisabled(dateObj) {
		if (resolveMatcher(props.isMonthDisabled)?.(dateObj) || props.disabled.value) return true;
		if (props.maxValue.value && isAfter(dateObj.set({ day: 1 }), props.maxValue.value)) return true;
		if (props.minValue.value && isBefore(endOfMonth(dateObj), props.minValue.value)) return true;
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
			return isAfter(nextDate.set({
				month: 1,
				day: 1
			}), props.maxValue.value);
		}
		const nextYear = currentDate.add({ years: 1 }).set({
			month: 1,
			day: 1
		});
		return isAfter(nextYear, props.maxValue.value);
	};
	const isPrevButtonDisabled = (prevPageFunc) => {
		if (!props.minValue.value) return false;
		if (props.disabled.value) return true;
		const currentDate = grid.value.value;
		if (prevPageFunc || props.prevPage.value) {
			const prevDate = (prevPageFunc || props.prevPage.value)(currentDate);
			return isBefore(endOfMonth(prevDate.set({ month: 12 })), props.minValue.value);
		}
		const prevYear = currentDate.subtract({ years: 1 }).set({
			month: 12,
			day: 31
		});
		return isBefore(prevYear, props.minValue.value);
	};
	const nextPage = (nextPageFunc) => {
		const currentDate = grid.value.value;
		if (nextPageFunc || props.nextPage.value) {
			const newDate$1 = (nextPageFunc || props.nextPage.value)(currentDate);
			grid.value = createMonthGrid({ dateObj: newDate$1 });
			props.placeholder.value = newDate$1.set({ day: 1 });
			return;
		}
		const newDate = currentDate.add({ years: 1 });
		grid.value = createMonthGrid({ dateObj: newDate });
		props.placeholder.value = newDate.set({ day: 1 });
	};
	const prevPage = (prevPageFunc) => {
		const currentDate = grid.value.value;
		if (prevPageFunc || props.prevPage.value) {
			const newDate$1 = (prevPageFunc || props.prevPage.value)(currentDate);
			grid.value = createMonthGrid({ dateObj: newDate$1 });
			props.placeholder.value = newDate$1.set({ day: 1 });
			return;
		}
		const newDate = currentDate.subtract({ years: 1 });
		grid.value = createMonthGrid({ dateObj: newDate });
		props.placeholder.value = newDate.set({ day: 1 });
	};
	watch(props.placeholder, (value) => {
		if (value.year === grid.value.value.year) return;
		grid.value = createMonthGrid({ dateObj: value });
	});
	watch(props.locale, () => {
		formatter.setLocale(props.locale.value);
		grid.value = createMonthGrid({ dateObj: props.placeholder.value });
	});
	const headingValue = computed(() => {
		if (props.locale.value !== formatter.getLocale()) formatter.setLocale(props.locale.value);
		return formatter.fullYear(toDate(grid.value.value), headingFormatOptions.value);
	});
	const fullCalendarLabel = computed(() => `${props.calendarLabel.value ?? "Month Picker"}, ${headingValue.value}`);
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
export { useMonthPicker, useMonthPickerState };
//# sourceMappingURL=useMonthPicker.js.map