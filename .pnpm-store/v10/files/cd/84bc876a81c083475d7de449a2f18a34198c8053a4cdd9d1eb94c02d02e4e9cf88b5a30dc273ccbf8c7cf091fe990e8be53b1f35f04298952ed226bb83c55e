const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_date_comparators = require('../date/comparators.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/MonthRangePicker/useRangeMonthPicker.ts
function useRangeMonthPickerState(props) {
	const isStartInvalid = (0, vue.computed)(() => {
		if (!props.start.value) return false;
		if (props.isMonthDisabled(props.start.value)) return true;
		return false;
	});
	const isEndInvalid = (0, vue.computed)(() => {
		if (!props.end.value) return false;
		if (props.isMonthDisabled(props.end.value)) return true;
		return false;
	});
	const isInvalid = (0, vue.computed)(() => {
		if (isStartInvalid.value || isEndInvalid.value) return true;
		if (props.start.value && props.end.value && require_date_comparators.compareYearMonth(props.end.value, props.start.value) < 0) return true;
		return false;
	});
	const isSelectionStart = (date) => {
		if (!props.start.value) return false;
		return require_date_comparators.isSameYearMonth(props.start.value, date);
	};
	const isSelectionEnd = (date) => {
		if (!props.end.value) return false;
		return require_date_comparators.isSameYearMonth(props.end.value, date);
	};
	const isSelected = (date) => {
		if (props.start.value && require_date_comparators.isSameYearMonth(props.start.value, date)) return true;
		if (props.end.value && require_date_comparators.isSameYearMonth(props.end.value, date)) return true;
		if (props.end.value && props.start.value) return require_date_comparators.compareYearMonth(date, props.start.value) > 0 && require_date_comparators.compareYearMonth(date, props.end.value) < 0;
		return false;
	};
	const rangeIsMonthDisabled = (date) => {
		if (props.isMonthDisabled(date)) return true;
		if (props.maximumMonths?.value) {
			const maximumMonths = props.maximumMonths.value;
			if (props.start.value && props.end.value) {
				if (props.fixedDate.value) {
					const diff = require_date_comparators.getMonthsBetween(props.start.value, props.end.value);
					if (diff <= maximumMonths) {
						const monthsLeft = maximumMonths - diff;
						const startLimit = props.start.value.subtract({ months: monthsLeft });
						const endLimit = props.end.value.add({ months: monthsLeft });
						return require_date_comparators.compareYearMonth(date, startLimit) < 0 || require_date_comparators.compareYearMonth(date, endLimit) > 0;
					}
					const fixedValue = props.fixedDate.value === "start" ? props.start.value : props.end.value;
					const maxDate = fixedValue.add({ months: maximumMonths - 1 });
					const minDate = fixedValue.subtract({ months: maximumMonths - 1 });
					return require_date_comparators.compareYearMonth(date, minDate) < 0 || require_date_comparators.compareYearMonth(date, maxDate) > 0;
				}
				return false;
			}
			if (props.start.value) {
				const maxDate = props.start.value.add({ months: maximumMonths - 1 });
				const minDate = props.start.value.subtract({ months: maximumMonths - 1 });
				return require_date_comparators.compareYearMonth(date, minDate) < 0 || require_date_comparators.compareYearMonth(date, maxDate) > 0;
			}
		}
		return false;
	};
	const highlightedRange = (0, vue.computed)(() => {
		if (props.start.value && props.end.value && !props.fixedDate.value) return null;
		if (!props.start.value || !props.focusedValue.value) return null;
		const isStartBeforeFocused = require_date_comparators.compareYearMonth(props.start.value, props.focusedValue.value) < 0;
		const start = isStartBeforeFocused ? props.start.value : props.focusedValue.value;
		const end = isStartBeforeFocused ? props.focusedValue.value : props.start.value;
		if (require_date_comparators.isSameYearMonth(start, end)) return {
			start,
			end
		};
		if (props.maximumMonths?.value && !props.end.value) {
			const maximumMonths = props.maximumMonths.value;
			const anchor = props.start.value;
			const focused = props.focusedValue.value;
			if (require_date_comparators.compareYearMonth(focused, anchor) >= 0) {
				const maxEnd = anchor.add({ months: maximumMonths - 1 });
				const cappedEnd = require_date_comparators.compareYearMonth(focused, maxEnd) > 0 ? maxEnd : focused;
				return {
					start: anchor,
					end: cappedEnd
				};
			} else {
				const minStart = anchor.subtract({ months: maximumMonths - 1 });
				const cappedStart = require_date_comparators.compareYearMonth(focused, minStart) < 0 ? minStart : focused;
				return {
					start: cappedStart,
					end: anchor
				};
			}
		}
		const isValid = require_date_comparators.areAllMonthsBetweenValid(start, end, props.allowNonContiguousRanges.value ? () => false : props.isMonthUnavailable, rangeIsMonthDisabled);
		if (isValid) return {
			start,
			end
		};
		return null;
	});
	const isHighlightedStart = (date) => {
		if (!highlightedRange.value?.start) return false;
		return require_date_comparators.isSameYearMonth(highlightedRange.value.start, date);
	};
	const isHighlightedEnd = (date) => {
		if (!highlightedRange.value?.end) return false;
		return require_date_comparators.isSameYearMonth(highlightedRange.value.end, date);
	};
	return {
		isInvalid,
		isSelected,
		highlightedRange,
		isSelectionStart,
		isSelectionEnd,
		isHighlightedStart,
		isHighlightedEnd,
		isMonthDisabled: rangeIsMonthDisabled
	};
}

//#endregion
Object.defineProperty(exports, 'useRangeMonthPickerState', {
  enumerable: true,
  get: function () {
    return useRangeMonthPickerState;
  }
});
//# sourceMappingURL=useRangeMonthPicker.cjs.map