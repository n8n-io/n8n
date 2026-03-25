const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_date_comparators = require('./comparators.cjs');
const require_shared_useKbd = require('../shared/useKbd.cjs');
const require_date_segment = require('./segment.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/shared/date/useDateField.ts
function commonSegmentAttrs(props) {
	return {
		role: "spinbutton",
		contenteditable: true,
		tabindex: props.disabled ? void 0 : 0,
		spellcheck: false,
		inputmode: "numeric",
		autocorrect: "off",
		enterkeyhint: "next",
		style: "caret-color: transparent;"
	};
}
function daySegmentAttrs(props) {
	const { segmentValues, placeholder } = props;
	const isEmpty = segmentValues.day === null;
	const date = segmentValues.day ? placeholder.set({ day: segmentValues.day }) : placeholder;
	const valueNow = date.day;
	const valueMin = 1;
	const valueMax = require_date_comparators.getDaysInMonth(date);
	const valueText = isEmpty ? "Empty" : `${valueNow}`;
	return {
		...commonSegmentAttrs(props),
		"aria-label": "day,",
		"aria-valuemin": valueMin,
		"aria-valuemax": valueMax,
		"aria-valuenow": valueNow,
		"aria-valuetext": valueText,
		"data-placeholder": isEmpty ? "" : void 0
	};
}
function monthSegmentAttrs(props) {
	const { segmentValues, placeholder, formatter } = props;
	const isEmpty = segmentValues.month === null;
	const date = segmentValues.month ? placeholder.set({ month: segmentValues.month }) : placeholder;
	const valueNow = date.month;
	const valueMin = 1;
	const valueMax = 12;
	const valueText = isEmpty ? "Empty" : `${valueNow} - ${formatter.fullMonth(require_date_comparators.toDate(date))}`;
	return {
		...commonSegmentAttrs(props),
		"aria-label": "month, ",
		"contenteditable": true,
		"aria-valuemin": valueMin,
		"aria-valuemax": valueMax,
		"aria-valuenow": valueNow,
		"aria-valuetext": valueText,
		"data-placeholder": isEmpty ? "" : void 0
	};
}
function yearSegmentAttrs(props) {
	const { segmentValues, placeholder } = props;
	const isEmpty = segmentValues.year === null;
	const date = segmentValues.year ? placeholder.set({ year: segmentValues.year }) : placeholder;
	const valueMin = 1;
	const valueMax = 9999;
	const valueNow = date.year;
	const valueText = isEmpty ? "Empty" : `${valueNow}`;
	return {
		...commonSegmentAttrs(props),
		"aria-label": "year, ",
		"aria-valuemin": valueMin,
		"aria-valuemax": valueMax,
		"aria-valuenow": valueNow,
		"aria-valuetext": valueText,
		"data-placeholder": isEmpty ? "" : void 0
	};
}
function hourSegmentAttrs(props) {
	const { segmentValues, hourCycle, placeholder } = props;
	if (!("hour" in segmentValues) || !("hour" in placeholder)) return {};
	const isEmpty = segmentValues.hour === null;
	const date = segmentValues.hour ? placeholder.set({ hour: segmentValues.hour }) : placeholder;
	const valueMin = hourCycle === 12 ? 1 : 0;
	const valueMax = hourCycle === 12 ? 12 : 23;
	const valueNow = date.hour;
	const valueText = isEmpty ? "Empty" : `${valueNow} ${segmentValues.dayPeriod ?? ""}`;
	return {
		...commonSegmentAttrs(props),
		"aria-label": "hour, ",
		"aria-valuemin": valueMin,
		"aria-valuemax": valueMax,
		"aria-valuenow": valueNow,
		"aria-valuetext": valueText,
		"data-placeholder": isEmpty ? "" : void 0
	};
}
function minuteSegmentAttrs(props) {
	const { segmentValues, placeholder } = props;
	if (!("minute" in segmentValues) || !("minute" in placeholder)) return {};
	const isEmpty = segmentValues.minute === null;
	const date = segmentValues.minute ? placeholder.set({ minute: segmentValues.minute }) : placeholder;
	const valueNow = date.minute;
	const valueMin = 0;
	const valueMax = 59;
	const valueText = isEmpty ? "Empty" : `${valueNow}`;
	return {
		...commonSegmentAttrs(props),
		"aria-label": "minute, ",
		"aria-valuemin": valueMin,
		"aria-valuemax": valueMax,
		"aria-valuenow": valueNow,
		"aria-valuetext": valueText,
		"data-placeholder": isEmpty ? "" : void 0
	};
}
function secondSegmentAttrs(props) {
	const { segmentValues, placeholder } = props;
	if (!("second" in segmentValues) || !("second" in placeholder)) return {};
	const isEmpty = segmentValues.second === null;
	const date = segmentValues.second ? placeholder.set({ second: segmentValues.second }) : placeholder;
	const valueNow = date.second;
	const valueMin = 0;
	const valueMax = 59;
	const valueText = isEmpty ? "Empty" : `${valueNow}`;
	return {
		...commonSegmentAttrs(props),
		"aria-label": "second, ",
		"aria-valuemin": valueMin,
		"aria-valuemax": valueMax,
		"aria-valuenow": valueNow,
		"aria-valuetext": valueText,
		"data-placeholder": isEmpty ? "" : void 0
	};
}
function dayPeriodSegmentAttrs(props) {
	const { segmentValues } = props;
	if (!("dayPeriod" in segmentValues)) return {};
	const valueMin = 0;
	const valueMax = 12;
	const valueNow = segmentValues.hour ? segmentValues.hour > 12 ? segmentValues.hour - 12 : segmentValues.hour : 0;
	const valueText = segmentValues.dayPeriod ?? "AM";
	return {
		...commonSegmentAttrs(props),
		"inputmode": "text",
		"aria-label": "AM/PM",
		"aria-valuemin": valueMin,
		"aria-valuemax": valueMax,
		"aria-valuenow": valueNow,
		"aria-valuetext": valueText
	};
}
function literalSegmentAttrs(_props) {
	return {
		"aria-hidden": true,
		"data-segment": "literal"
	};
}
function timeZoneSegmentAttrs(props) {
	return {
		"role": "textbox",
		"aria-label": "timezone, ",
		"data-readonly": true,
		"data-segment": "timeZoneName",
		"tabindex": props.disabled ? void 0 : 0,
		"style": "caret-color: transparent;"
	};
}
function eraSegmentAttrs(props) {
	const { segmentValues, placeholder } = props;
	const valueMin = 0;
	const valueMax = 0;
	const valueNow = 0;
	const valueText = "era" in segmentValues ? segmentValues.era : placeholder.era;
	return {
		...commonSegmentAttrs(props),
		"aria-label": "era",
		"aria-valuemin": valueMin,
		"aria-valuemax": valueMax,
		"aria-valuenow": valueNow,
		"aria-valuetext": valueText
	};
}
const segmentBuilders = {
	day: { attrs: daySegmentAttrs },
	month: { attrs: monthSegmentAttrs },
	year: { attrs: yearSegmentAttrs },
	hour: { attrs: hourSegmentAttrs },
	minute: { attrs: minuteSegmentAttrs },
	second: { attrs: secondSegmentAttrs },
	dayPeriod: { attrs: dayPeriodSegmentAttrs },
	literal: { attrs: literalSegmentAttrs },
	timeZoneName: { attrs: timeZoneSegmentAttrs },
	era: { attrs: eraSegmentAttrs }
};
function useDateField(props) {
	const kbd = require_shared_useKbd.useKbd();
	function minuteSecondIncrementation({ e, part, dateRef, prevValue }) {
		const step = props.step.value[part] ?? 1;
		const sign = e.key === kbd.ARROW_UP ? step : -step;
		const min = 0;
		const max = 59;
		if (prevValue === null) return sign > 0 ? min : max;
		const cycleArgs = [part, sign];
		return dateRef.set({ [part]: prevValue }).cycle(...cycleArgs)[part];
	}
	function deleteValue(prevValue) {
		props.hasLeftFocus.value = false;
		if (prevValue === null) return prevValue;
		const str = prevValue.toString();
		if (str.length === 1) {
			props.modelValue.value = void 0;
			return null;
		}
		return Number.parseInt(str.slice(0, -1));
	}
	function dateTimeValueIncrementation({ e, part, dateRef, prevValue, hourCycle }) {
		const step = props.step.value[part] ?? 1;
		const sign = e.key === kbd.ARROW_UP ? step : -step;
		if (prevValue === null) return dateRef[part];
		if (part === "hour" && "hour" in dateRef) {
			const cycleArgs$1 = [
				part,
				sign,
				{ hourCycle }
			];
			return dateRef.set({ [part]: prevValue }).cycle(...cycleArgs$1)[part];
		}
		const cycleArgs = [part, sign];
		if (part === "day") return dateRef.set({
			[part]: prevValue,
			month: props.segmentValues.value.month ?? 1
		}).cycle(...cycleArgs)[part];
		return dateRef.set({ [part]: prevValue }).cycle(...cycleArgs)[part];
	}
	function updateDayOrMonth(max, num, prev) {
		let moveToNext = false;
		const maxStart = Math.floor(max / 10);
		/**
		* If the user has left the segment, we want to reset the
		* `prev` value so that we can start the segment over again
		* when the user types a number.
		*/
		if (props.hasLeftFocus.value) {
			props.hasLeftFocus.value = false;
			prev = null;
		}
		if (prev === null) {
			/**
			* If the user types a 0 as the first number, we want
			* to keep track of that so that when they type the next
			* number, we can move to the next segment.
			*/
			if (num === 0) {
				props.lastKeyZero.value = true;
				return {
					value: null,
					moveToNext
				};
			}
			/**
			* If the last key was a 0, or if the first number is
			* greater than the max start digit (0-3 in most cases), then
			* we want to move to the next segment, since it's not possible
			* to continue typing a valid number in this segment.
			*/
			if (props.lastKeyZero.value || num > maxStart) moveToNext = true;
			props.lastKeyZero.value = false;
			/**
			* If none of the above conditions are met, then we can just
			* return the number as the segment value and continue typing
			* in this segment.
			*/
			return {
				value: num,
				moveToNext
			};
		}
		/**
		* If the number of digits is 2, or if the total with the existing digit
		* and the pressed digit is greater than the maximum value for this
		* month, then we will reset the segment as if the user had pressed the
		* backspace key and then typed the number.
		*/
		const digits = prev.toString().length;
		const total = Number.parseInt(prev.toString() + num.toString());
		/**
		* If the number of digits is 2, or if the total with the existing digit
		* and the pressed digit is greater than the maximum value for this
		* month, then we will reset the segment as if the user had pressed the
		* backspace key and then typed the number.
		*/
		if (digits === 2 || total > max) {
			/**
			* As we're doing elsewhere, we're checking if the number is greater
			* than the max start digit (0-3 in most months), and if so, we're
			* going to move to the next segment.
			*/
			if (num > maxStart || total > max) moveToNext = true;
			return {
				value: num,
				moveToNext
			};
		}
		moveToNext = true;
		return {
			value: total,
			moveToNext
		};
	}
	function updateMinuteOrSecond(num, prev) {
		const max = 59;
		let moveToNext = false;
		const maxStart = Math.floor(max / 10);
		/**
		* If the user has left the segment, we want to reset the
		* `prev` value so that we can start the segment over again
		* when the user types a number.
		*/
		if (props.hasLeftFocus.value) {
			props.hasLeftFocus.value = false;
			prev = null;
		}
		if (prev === null) {
			/**
			* If the user types a 0 as the first number, we want
			* to keep track of that so that when they type the next
			* number, we can move to the next segment.
			*/
			if (num === 0) {
				props.lastKeyZero.value = true;
				return {
					value: 0,
					moveToNext
				};
			}
			/**
			* If the last key was a 0, or if the first number is
			* greater than the max start digit (0-3 in most cases), then
			* we want to move to the next segment, since it's not possible
			* to continue typing a valid number in this segment.
			*/
			if (props.lastKeyZero.value || num > maxStart) moveToNext = true;
			props.lastKeyZero.value = false;
			/**
			* If none of the above conditions are met, then we can just
			* return the number as the segment value and continue typing
			* in this segment.
			*/
			return {
				value: num,
				moveToNext
			};
		}
		/**
		* If the number of digits is 2, or if the total with the existing digit
		* and the pressed digit is greater than the maximum value for this
		* month, then we will reset the segment as if the user had pressed the
		* backspace key and then typed the number.
		*/
		const digits = prev.toString().length;
		const total = Number.parseInt(prev.toString() + num.toString());
		/**
		* If the number of digits is 2, or if the total with the existing digit
		* and the pressed digit is greater than the maximum value for this
		* month, then we will reset the segment as if the user had pressed the
		* backspace key and then typed the number.
		*/
		if (digits === 2 || total > max) {
			/**
			* As we're doing elsewhere, we're checking if the number is greater
			* than the max start digit (0-3 in most months), and if so, we're
			* going to move to the next segment.
			*/
			if (num > maxStart) moveToNext = true;
			return {
				value: num,
				moveToNext
			};
		}
		moveToNext = true;
		return {
			value: total,
			moveToNext
		};
	}
	function updateHour(num, prev) {
		const max = 24;
		let moveToNext = false;
		const maxStart = Math.floor(max / 10);
		/**
		* If the user has left the segment, we want to reset the
		* `prev` value so that we can start the segment over again
		* when the user types a number.
		*/
		if (props.hasLeftFocus.value) {
			props.hasLeftFocus.value = false;
			prev = null;
		}
		if (prev === null) {
			/**
			* If the user types a 0 as the first number, we want
			* to keep track of that so that when they type the next
			* number, we can move to the next segment.
			*/
			if (num === 0) {
				props.lastKeyZero.value = true;
				return {
					value: 0,
					moveToNext
				};
			}
			/**
			* If the last key was a 0, or if the first number is
			* greater than the max start digit (0-3 in most cases), then
			* we want to move to the next segment, since it's not possible
			* to continue typing a valid number in this segment.
			*/
			if (props.lastKeyZero.value || num > maxStart) moveToNext = true;
			props.lastKeyZero.value = false;
			/**
			* If none of the above conditions are met, then we can just
			* return the number as the segment value and continue typing
			* in this segment.
			*/
			return {
				value: num,
				moveToNext
			};
		}
		/**
		* If the number of digits is 2, or if the total with the existing digit
		* and the pressed digit is greater than the maximum value for this
		* month, then we will reset the segment as if the user had pressed the
		* backspace key and then typed the number.
		*/
		const digits = prev.toString().length;
		const total = Number.parseInt(prev.toString() + num.toString());
		/**
		* If the number of digits is 2, or if the total with the existing digit
		* and the pressed digit is greater than the maximum value for this
		* month, then we will reset the segment as if the user had pressed the
		* backspace key and then typed the number.
		*/
		if (digits === 2 || total > max) {
			/**
			* As we're doing elsewhere, we're checking if the number is greater
			* than the max start digit (0-3 in most months), and if so, we're
			* going to move to the next segment.
			*/
			if (num > maxStart) moveToNext = true;
			return {
				value: num,
				moveToNext
			};
		}
		moveToNext = true;
		return {
			value: total,
			moveToNext
		};
	}
	function updateYear(num, prev) {
		let moveToNext = false;
		/**
		* If the user has left the segment, we want to reset the
		* `prev` value so that we can start the segment over again
		* when the user types a number.
		*/
		if (props.hasLeftFocus.value) {
			props.hasLeftFocus.value = false;
			prev = null;
		}
		if (prev === null) return {
			value: num === 0 ? 1 : num,
			moveToNext
		};
		const str = prev.toString() + num.toString();
		if (str.length > 4) return {
			value: num === 0 ? 1 : num,
			moveToNext
		};
		if (str.length === 4) moveToNext = true;
		const int = Number.parseInt(str);
		return {
			value: int,
			moveToNext
		};
	}
	const attributes = (0, vue.computed)(() => segmentBuilders[props.part]?.attrs({
		disabled: props.disabled.value,
		placeholder: props.placeholder.value,
		hourCycle: props.hourCycle,
		segmentValues: props.segmentValues.value,
		formatter: props.formatter
	}) ?? {});
	function handleDaySegmentKeydown(e) {
		if (!require_date_segment.isAcceptableSegmentKey(e.key) || require_date_segment.isSegmentNavigationKey(e.key)) return;
		const prevValue = props.segmentValues.value.day;
		if (e.key === kbd.ARROW_DOWN || e.key === kbd.ARROW_UP) {
			props.segmentValues.value.day = dateTimeValueIncrementation({
				e,
				part: "day",
				dateRef: props.placeholder.value,
				prevValue
			});
			return;
		}
		if (require_date_segment.isNumberString(e.key)) {
			const num = Number.parseInt(e.key);
			const segmentMonthValue = props.segmentValues.value.month;
			const daysInMonth = segmentMonthValue ? require_date_comparators.getDaysInMonth(props.placeholder.value.set({ month: segmentMonthValue })) : 31;
			const { value, moveToNext } = updateDayOrMonth(daysInMonth, num, prevValue);
			props.segmentValues.value.day = value;
			if (moveToNext) props.focusNext();
		}
		if (e.key === kbd.BACKSPACE) {
			props.hasLeftFocus.value = false;
			props.segmentValues.value.day = deleteValue(prevValue);
		}
	}
	function handleMonthSegmentKeydown(e) {
		if (!require_date_segment.isAcceptableSegmentKey(e.key) || require_date_segment.isSegmentNavigationKey(e.key)) return;
		const prevValue = props.segmentValues.value.month;
		if (e.key === kbd.ARROW_DOWN || e.key === kbd.ARROW_UP) {
			props.segmentValues.value.month = dateTimeValueIncrementation({
				e,
				part: "month",
				dateRef: props.placeholder.value,
				prevValue
			});
			return;
		}
		if (require_date_segment.isNumberString(e.key)) {
			const num = Number.parseInt(e.key);
			const { value, moveToNext } = updateDayOrMonth(12, num, prevValue);
			props.segmentValues.value.month = value;
			if (moveToNext) props.focusNext();
		}
		if (e.key === kbd.BACKSPACE) {
			props.hasLeftFocus.value = false;
			props.segmentValues.value.month = deleteValue(prevValue);
		}
	}
	function handleYearSegmentKeydown(e) {
		if (!require_date_segment.isAcceptableSegmentKey(e.key) || require_date_segment.isSegmentNavigationKey(e.key)) return;
		const prevValue = props.segmentValues.value.year;
		if (e.key === kbd.ARROW_DOWN || e.key === kbd.ARROW_UP) {
			props.segmentValues.value.year = dateTimeValueIncrementation({
				e,
				part: "year",
				dateRef: props.placeholder.value,
				prevValue
			});
			return;
		}
		if (require_date_segment.isNumberString(e.key)) {
			const num = Number.parseInt(e.key);
			const { value, moveToNext } = updateYear(num, prevValue);
			props.segmentValues.value.year = value;
			if (moveToNext) props.focusNext();
		}
		if (e.key === kbd.BACKSPACE) {
			props.hasLeftFocus.value = false;
			props.segmentValues.value.year = deleteValue(prevValue);
		}
	}
	function handleHourSegmentKeydown(e) {
		const dateRef = props.placeholder.value;
		if (!require_date_segment.isAcceptableSegmentKey(e.key) || require_date_segment.isSegmentNavigationKey(e.key) || !("hour" in dateRef) || !("hour" in props.segmentValues.value)) return;
		const prevValue = props.segmentValues.value.hour;
		const hourCycle = props.hourCycle;
		if (e.key === kbd.ARROW_UP || e.key === kbd.ARROW_DOWN) {
			props.segmentValues.value.hour = dateTimeValueIncrementation({
				e,
				part: "hour",
				dateRef: props.placeholder.value,
				prevValue,
				hourCycle
			});
			if ("dayPeriod" in props.segmentValues.value) {
				if (props.segmentValues.value.hour < 12) props.segmentValues.value.dayPeriod = "AM";
				else if (props.segmentValues.value.hour) props.segmentValues.value.dayPeriod = "PM";
			}
			return;
		}
		if (require_date_segment.isNumberString(e.key)) {
			const num = Number.parseInt(e.key);
			const { value, moveToNext } = updateHour(num, prevValue);
			if ("dayPeriod" in props.segmentValues.value && value && value > 12) props.segmentValues.value.dayPeriod = "PM";
			else if ("dayPeriod" in props.segmentValues.value && value) props.segmentValues.value.dayPeriod = "AM";
			props.segmentValues.value.hour = value;
			if (moveToNext) props.focusNext();
		}
		if (e.key === kbd.BACKSPACE) {
			props.hasLeftFocus.value = false;
			props.segmentValues.value.hour = deleteValue(prevValue);
		}
	}
	function handleMinuteSegmentKeydown(e) {
		const dateRef = props.placeholder.value;
		if (!require_date_segment.isAcceptableSegmentKey(e.key) || require_date_segment.isSegmentNavigationKey(e.key) || !("minute" in dateRef) || !("minute" in props.segmentValues.value)) return;
		const prevValue = props.segmentValues.value.minute;
		if (e.key === kbd.ARROW_UP || e.key === kbd.ARROW_DOWN) props.segmentValues.value.minute = minuteSecondIncrementation({
			e,
			part: "minute",
			dateRef: props.placeholder.value,
			prevValue
		});
		if (require_date_segment.isNumberString(e.key)) {
			const num = Number.parseInt(e.key);
			const { value, moveToNext } = updateMinuteOrSecond(num, prevValue);
			props.segmentValues.value.minute = value;
			if (moveToNext) props.focusNext();
		}
		if (e.key === kbd.BACKSPACE) {
			props.hasLeftFocus.value = false;
			props.segmentValues.value.minute = deleteValue(prevValue);
		}
	}
	function handleSecondSegmentKeydown(e) {
		const dateRef = props.placeholder.value;
		if (!require_date_segment.isAcceptableSegmentKey(e.key) || require_date_segment.isSegmentNavigationKey(e.key) || !("second" in dateRef) || !("second" in props.segmentValues.value)) return;
		const prevValue = props.segmentValues.value.second;
		if (e.key === kbd.ARROW_UP || e.key === kbd.ARROW_DOWN) props.segmentValues.value.second = minuteSecondIncrementation({
			e,
			part: "second",
			dateRef: props.placeholder.value,
			prevValue
		});
		if (require_date_segment.isNumberString(e.key)) {
			const num = Number.parseInt(e.key);
			const { value, moveToNext } = updateMinuteOrSecond(num, prevValue);
			props.segmentValues.value.second = value;
			if (moveToNext) props.focusNext();
		}
		if (e.key === kbd.BACKSPACE) {
			props.hasLeftFocus.value = false;
			props.segmentValues.value.second = deleteValue(prevValue);
		}
	}
	function handleDayPeriodSegmentKeydown(e) {
		if ((!require_date_segment.isAcceptableSegmentKey(e.key) || require_date_segment.isSegmentNavigationKey(e.key)) && e.key !== "a" && e.key !== "p" || !("hour" in props.placeholder.value) || !("dayPeriod" in props.segmentValues.value)) return;
		if (e.key === kbd.ARROW_UP || e.key === kbd.ARROW_DOWN) {
			if (props.segmentValues.value.dayPeriod === "AM") {
				props.segmentValues.value.dayPeriod = "PM";
				props.segmentValues.value.hour = props.segmentValues.value.hour + 12;
				return;
			}
			props.segmentValues.value.dayPeriod = "AM";
			props.segmentValues.value.hour = props.segmentValues.value.hour - 12;
			return;
		}
		if (["a", "A"].includes(e.key) && props.segmentValues.value.dayPeriod !== "AM") {
			props.segmentValues.value.dayPeriod = "AM";
			props.segmentValues.value.hour = props.segmentValues.value.hour - 12;
			return;
		}
		if (["p", "P"].includes(e.key) && props.segmentValues.value.dayPeriod !== "PM") {
			props.segmentValues.value.dayPeriod = "PM";
			props.segmentValues.value.hour = props.segmentValues.value.hour + 12;
		}
	}
	function handleSegmentClick(e) {
		const disabled = props.disabled.value;
		if (disabled) e.preventDefault();
	}
	function handleSegmentKeydown(e) {
		const disabled = props.disabled.value;
		const readonly = props.readonly.value;
		if (e.key !== kbd.TAB) e.preventDefault();
		if (disabled || readonly) return;
		const segmentKeydownHandlers = {
			day: handleDaySegmentKeydown,
			month: handleMonthSegmentKeydown,
			year: handleYearSegmentKeydown,
			hour: handleHourSegmentKeydown,
			minute: handleMinuteSegmentKeydown,
			second: handleSecondSegmentKeydown,
			dayPeriod: handleDayPeriodSegmentKeydown,
			timeZoneName: () => {}
		};
		segmentKeydownHandlers[props.part](e);
		if (![kbd.ARROW_LEFT, kbd.ARROW_RIGHT].includes(e.key) && e.key !== kbd.TAB && e.key !== kbd.SHIFT && require_date_segment.isAcceptableSegmentKey(e.key)) {
			if (Object.values(props.segmentValues.value).every((item) => item !== null)) {
				const updateObject = { ...props.segmentValues.value };
				let dateRef = props.placeholder.value.copy();
				Object.keys(updateObject).forEach((part) => {
					const value = updateObject[part];
					dateRef = dateRef.set({ [part]: value });
				});
				props.modelValue.value = dateRef.copy();
			}
		}
	}
	return {
		handleSegmentClick,
		handleSegmentKeydown,
		attributes
	};
}

//#endregion
Object.defineProperty(exports, 'useDateField', {
  enumerable: true,
  get: function () {
    return useDateField;
  }
});
//# sourceMappingURL=useDateField.cjs.map