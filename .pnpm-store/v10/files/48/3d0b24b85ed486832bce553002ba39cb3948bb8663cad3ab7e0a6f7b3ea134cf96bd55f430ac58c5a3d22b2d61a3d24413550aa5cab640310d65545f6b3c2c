const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_date_comparators = require('../date/comparators.cjs');
const require_date_calendar = require('../date/calendar.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __internationalized_date = require_rolldown_runtime.__toESM(require("@internationalized/date"));

//#region src/RangeCalendar/useRangeCalendar.ts
function useRangeCalendarState(props) {
	const isStartInvalid = (0, vue.computed)(() => {
		if (!props.start.value) return false;
		if (props.isDateDisabled(props.start.value)) return true;
		return false;
	});
	const isEndInvalid = (0, vue.computed)(() => {
		if (!props.end.value) return false;
		if (props.isDateDisabled(props.end.value)) return true;
		return false;
	});
	const isInvalid = (0, vue.computed)(() => {
		if (isStartInvalid.value || isEndInvalid.value) return false;
		if (props.start.value && props.end.value && require_date_comparators.isBefore(props.end.value, props.start.value)) return true;
		return false;
	});
	const isSelectionStart = (date) => {
		if (!props.start.value) return false;
		return (0, __internationalized_date.isSameDay)(props.start.value, date);
	};
	const isSelectionEnd = (date) => {
		if (!props.end.value) return false;
		return (0, __internationalized_date.isSameDay)(props.end.value, date);
	};
	const isSelected = (date) => {
		if (props.start.value && (0, __internationalized_date.isSameDay)(props.start.value, date)) return true;
		if (props.end.value && (0, __internationalized_date.isSameDay)(props.end.value, date)) return true;
		if (props.end.value && props.start.value) return require_date_comparators.isBetween(date, props.start.value, props.end.value);
		return false;
	};
	const rangeIsDateDisabled = (date) => {
		if (props.isDateDisabled(date)) return true;
		if (props.maximumDays?.value) {
			if (props.start.value && props.end.value) {
				if (props.fixedDate.value) {
					const diff = require_date_calendar.getDaysBetween(props.start.value, props.end.value).length;
					if (diff <= props.maximumDays.value) {
						const daysLeft = props.maximumDays.value - diff - 1;
						const startLimit = props.start.value.subtract({ days: daysLeft });
						const endLimit = props.end.value.add({ days: daysLeft });
						return !require_date_comparators.isBetween(date, startLimit, endLimit);
					}
				}
				return false;
			}
			if (props.start.value) {
				const maxDate = props.start.value.add({ days: props.maximumDays.value });
				const minDate = props.start.value.subtract({ days: props.maximumDays.value });
				return !require_date_comparators.isBetween(date, minDate, maxDate);
			}
		}
		if (!props.start.value || props.end.value || (0, __internationalized_date.isSameDay)(props.start.value, date)) return false;
		return false;
	};
	const isDateHighlightable = (date) => {
		if (props.isDateHighlightable?.(date)) return true;
		return false;
	};
	const highlightedRange = (0, vue.computed)(() => {
		if (props.start.value && props.end.value && !props.fixedDate.value) return null;
		if (!props.start.value || !props.focusedValue.value) return null;
		const isStartBeforeFocused = require_date_comparators.isBefore(props.start.value, props.focusedValue.value);
		const start = isStartBeforeFocused ? props.start.value : props.focusedValue.value;
		const end = isStartBeforeFocused ? props.focusedValue.value : props.start.value;
		if ((0, __internationalized_date.isSameDay)(start, end)) return {
			start,
			end
		};
		if (props.maximumDays?.value && !props.end.value) {
			const cappedEnd = isStartBeforeFocused ? start.add({ days: props.maximumDays.value }) : start.subtract({ days: props.maximumDays.value });
			return {
				start,
				end: cappedEnd
			};
		}
		const isValid = require_date_comparators.areAllDaysBetweenValid(start, end, props.allowNonContiguousRanges.value ? () => false : props.isDateUnavailable, rangeIsDateDisabled, props.isDateHighlightable);
		if (isValid) return {
			start,
			end
		};
		return null;
	});
	const isHighlightedStart = (date) => {
		if (!highlightedRange.value || !highlightedRange.value.start) return false;
		return (0, __internationalized_date.isSameDay)(highlightedRange.value.start, date);
	};
	const isHighlightedEnd = (date) => {
		if (!highlightedRange.value || !highlightedRange.value.end) return false;
		return (0, __internationalized_date.isSameDay)(highlightedRange.value.end, date);
	};
	return {
		isInvalid,
		isSelected,
		isDateHighlightable,
		highlightedRange,
		isSelectionStart,
		isSelectionEnd,
		isHighlightedStart,
		isHighlightedEnd,
		isDateDisabled: rangeIsDateDisabled
	};
}

//#endregion
Object.defineProperty(exports, 'useRangeCalendarState', {
  enumerable: true,
  get: function () {
    return useRangeCalendarState;
  }
});
//# sourceMappingURL=useRangeCalendar.cjs.map