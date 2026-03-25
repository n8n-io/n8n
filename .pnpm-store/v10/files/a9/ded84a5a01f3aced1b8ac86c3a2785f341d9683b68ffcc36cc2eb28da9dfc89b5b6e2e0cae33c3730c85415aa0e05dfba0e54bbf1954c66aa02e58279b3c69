import { areAllDaysBetweenValid, isBefore, isBetween } from "../date/comparators.js";
import { getDaysBetween } from "../date/calendar.js";
import { computed } from "vue";
import { isSameDay } from "@internationalized/date";

//#region src/RangeCalendar/useRangeCalendar.ts
function useRangeCalendarState(props) {
	const isStartInvalid = computed(() => {
		if (!props.start.value) return false;
		if (props.isDateDisabled(props.start.value)) return true;
		return false;
	});
	const isEndInvalid = computed(() => {
		if (!props.end.value) return false;
		if (props.isDateDisabled(props.end.value)) return true;
		return false;
	});
	const isInvalid = computed(() => {
		if (isStartInvalid.value || isEndInvalid.value) return false;
		if (props.start.value && props.end.value && isBefore(props.end.value, props.start.value)) return true;
		return false;
	});
	const isSelectionStart = (date) => {
		if (!props.start.value) return false;
		return isSameDay(props.start.value, date);
	};
	const isSelectionEnd = (date) => {
		if (!props.end.value) return false;
		return isSameDay(props.end.value, date);
	};
	const isSelected = (date) => {
		if (props.start.value && isSameDay(props.start.value, date)) return true;
		if (props.end.value && isSameDay(props.end.value, date)) return true;
		if (props.end.value && props.start.value) return isBetween(date, props.start.value, props.end.value);
		return false;
	};
	const rangeIsDateDisabled = (date) => {
		if (props.isDateDisabled(date)) return true;
		if (props.maximumDays?.value) {
			if (props.start.value && props.end.value) {
				if (props.fixedDate.value) {
					const diff = getDaysBetween(props.start.value, props.end.value).length;
					if (diff <= props.maximumDays.value) {
						const daysLeft = props.maximumDays.value - diff - 1;
						const startLimit = props.start.value.subtract({ days: daysLeft });
						const endLimit = props.end.value.add({ days: daysLeft });
						return !isBetween(date, startLimit, endLimit);
					}
				}
				return false;
			}
			if (props.start.value) {
				const maxDate = props.start.value.add({ days: props.maximumDays.value });
				const minDate = props.start.value.subtract({ days: props.maximumDays.value });
				return !isBetween(date, minDate, maxDate);
			}
		}
		if (!props.start.value || props.end.value || isSameDay(props.start.value, date)) return false;
		return false;
	};
	const isDateHighlightable = (date) => {
		if (props.isDateHighlightable?.(date)) return true;
		return false;
	};
	const highlightedRange = computed(() => {
		if (props.start.value && props.end.value && !props.fixedDate.value) return null;
		if (!props.start.value || !props.focusedValue.value) return null;
		const isStartBeforeFocused = isBefore(props.start.value, props.focusedValue.value);
		const start = isStartBeforeFocused ? props.start.value : props.focusedValue.value;
		const end = isStartBeforeFocused ? props.focusedValue.value : props.start.value;
		if (isSameDay(start, end)) return {
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
		const isValid = areAllDaysBetweenValid(start, end, props.allowNonContiguousRanges.value ? () => false : props.isDateUnavailable, rangeIsDateDisabled, props.isDateHighlightable);
		if (isValid) return {
			start,
			end
		};
		return null;
	});
	const isHighlightedStart = (date) => {
		if (!highlightedRange.value || !highlightedRange.value.start) return false;
		return isSameDay(highlightedRange.value.start, date);
	};
	const isHighlightedEnd = (date) => {
		if (!highlightedRange.value || !highlightedRange.value.end) return false;
		return isSameDay(highlightedRange.value.end, date);
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
export { useRangeCalendarState };
//# sourceMappingURL=useRangeCalendar.js.map