const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_date_comparators = require('../date/comparators.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/YearRangePicker/useRangeYearPicker.ts
function useRangeYearPickerState(props) {
	const isStartInvalid = (0, vue.computed)(() => {
		if (!props.start.value) return false;
		if (props.isYearDisabled(props.start.value)) return true;
		return false;
	});
	const isEndInvalid = (0, vue.computed)(() => {
		if (!props.end.value) return false;
		if (props.isYearDisabled(props.end.value)) return true;
		return false;
	});
	const isInvalid = (0, vue.computed)(() => {
		if (isStartInvalid.value || isEndInvalid.value) return true;
		if (props.start.value && props.end.value && props.end.value.year < props.start.value.year) return true;
		return false;
	});
	const isSelectionStart = (date) => {
		if (!props.start.value) return false;
		return require_date_comparators.isSameYear(props.start.value, date);
	};
	const isSelectionEnd = (date) => {
		if (!props.end.value) return false;
		return require_date_comparators.isSameYear(props.end.value, date);
	};
	const isSelected = (date) => {
		if (props.start.value && require_date_comparators.isSameYear(props.start.value, date)) return true;
		if (props.end.value && require_date_comparators.isSameYear(props.end.value, date)) return true;
		if (props.end.value && props.start.value) return date.year > props.start.value.year && date.year < props.end.value.year;
		return false;
	};
	const rangeIsYearDisabled = (date) => {
		if (props.isYearDisabled(date)) return true;
		if (props.maximumYears?.value) {
			const maximumYears = props.maximumYears.value;
			if (props.start.value && props.end.value) {
				if (props.fixedDate.value) {
					const diff = require_date_comparators.getYearsBetween(props.start.value, props.end.value);
					if (diff <= maximumYears) {
						const yearsLeft = maximumYears - diff;
						const startLimit = props.start.value.subtract({ years: yearsLeft });
						const endLimit = props.end.value.add({ years: yearsLeft });
						return date.year < startLimit.year || date.year > endLimit.year;
					}
					const fixedValue = props.fixedDate.value === "start" ? props.start.value : props.end.value;
					const maxDate = fixedValue.add({ years: maximumYears - 1 });
					const minDate = fixedValue.subtract({ years: maximumYears - 1 });
					return date.year < minDate.year || date.year > maxDate.year;
				}
				return false;
			}
			if (props.start.value) {
				const maxDate = props.start.value.add({ years: maximumYears - 1 });
				const minDate = props.start.value.subtract({ years: maximumYears - 1 });
				return date.year < minDate.year || date.year > maxDate.year;
			}
		}
		return false;
	};
	const highlightedRange = (0, vue.computed)(() => {
		if (props.start.value && props.end.value && !props.fixedDate.value) return null;
		if (!props.start.value || !props.focusedValue.value) return null;
		const isStartBeforeFocused = props.start.value.year < props.focusedValue.value.year;
		const start = isStartBeforeFocused ? props.start.value : props.focusedValue.value;
		const end = isStartBeforeFocused ? props.focusedValue.value : props.start.value;
		if (require_date_comparators.isSameYear(start, end)) return {
			start,
			end
		};
		if (props.maximumYears?.value && !props.end.value) {
			const maximumYears = props.maximumYears.value;
			const anchor = props.start.value;
			const focused = props.focusedValue.value;
			if (focused.year >= anchor.year) {
				const maxEnd = anchor.add({ years: maximumYears - 1 });
				const cappedEnd = focused.year > maxEnd.year ? maxEnd : focused;
				return {
					start: anchor,
					end: cappedEnd
				};
			} else {
				const minStart = anchor.subtract({ years: maximumYears - 1 });
				const cappedStart = focused.year < minStart.year ? minStart : focused;
				return {
					start: cappedStart,
					end: anchor
				};
			}
		}
		const isValid = require_date_comparators.areAllYearsBetweenValid(start, end, props.allowNonContiguousRanges.value ? () => false : props.isYearUnavailable, rangeIsYearDisabled);
		if (isValid) return {
			start,
			end
		};
		return null;
	});
	const isHighlightedStart = (date) => {
		if (!highlightedRange.value?.start) return false;
		return require_date_comparators.isSameYear(highlightedRange.value.start, date);
	};
	const isHighlightedEnd = (date) => {
		if (!highlightedRange.value?.end) return false;
		return require_date_comparators.isSameYear(highlightedRange.value.end, date);
	};
	return {
		isInvalid,
		isSelected,
		highlightedRange,
		isSelectionStart,
		isSelectionEnd,
		isHighlightedStart,
		isHighlightedEnd,
		isYearDisabled: rangeIsYearDisabled
	};
}

//#endregion
Object.defineProperty(exports, 'useRangeYearPickerState', {
  enumerable: true,
  get: function () {
    return useRangeYearPickerState;
  }
});
//# sourceMappingURL=useRangeYearPicker.cjs.map