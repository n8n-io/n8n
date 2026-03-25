import { createContext } from "../shared/createContext.js";
import { getDefaultDate, isBefore } from "../date/comparators.js";
import { handleCalendarInitialFocus } from "../date/utils.js";
import { useDirection } from "../shared/useDirection.js";
import { useKbd } from "../shared/useKbd.js";
import { useLocale } from "../shared/useLocale.js";
import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { useCalendar } from "../Calendar/useCalendar.js";
import { useRangeCalendarState } from "./useRangeCalendar.js";
import { createBlock, createElementVNode, defineComponent, onMounted, openBlock, ref, renderSlot, toDisplayString, toRefs, unref, watch, withCtx } from "vue";
import { useEventListener, useVModel } from "@vueuse/core";
import { isEqualDay } from "@internationalized/date";

//#region src/RangeCalendar/RangeCalendarRoot.vue?vue&type=script&setup=true&lang.ts
const _hoisted_1 = { style: {
	"border": "0px",
	"clip": "rect(0px, 0px, 0px, 0px)",
	"clip-path": "inset(50%)",
	"height": "1px",
	"margin": "-1px",
	"overflow": "hidden",
	"padding": "0px",
	"position": "absolute",
	"white-space": "nowrap",
	"width": "1px"
} };
const _hoisted_2 = {
	role: "heading",
	"aria-level": "2"
};
const [injectRangeCalendarRootContext, provideRangeCalendarRootContext] = createContext("RangeCalendarRoot");
var RangeCalendarRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "RangeCalendarRoot",
	props: {
		defaultPlaceholder: {
			type: null,
			required: false
		},
		defaultValue: {
			type: Object,
			required: false,
			default: () => ({
				start: void 0,
				end: void 0
			})
		},
		modelValue: {
			type: [Object, null],
			required: false
		},
		placeholder: {
			type: null,
			required: false,
			default: void 0
		},
		allowNonContiguousRanges: {
			type: Boolean,
			required: false,
			default: false
		},
		pagedNavigation: {
			type: Boolean,
			required: false,
			default: false
		},
		preventDeselect: {
			type: Boolean,
			required: false,
			default: false
		},
		maximumDays: {
			type: Number,
			required: false,
			default: void 0
		},
		weekStartsOn: {
			type: Number,
			required: false,
			default: 0
		},
		weekdayFormat: {
			type: String,
			required: false,
			default: "narrow"
		},
		calendarLabel: {
			type: String,
			required: false
		},
		fixedWeeks: {
			type: Boolean,
			required: false,
			default: false
		},
		maxValue: {
			type: null,
			required: false
		},
		minValue: {
			type: null,
			required: false
		},
		locale: {
			type: String,
			required: false
		},
		numberOfMonths: {
			type: Number,
			required: false,
			default: 1
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		readonly: {
			type: Boolean,
			required: false,
			default: false
		},
		initialFocus: {
			type: Boolean,
			required: false,
			default: false
		},
		isDateDisabled: {
			type: Function,
			required: false,
			default: void 0
		},
		isDateUnavailable: {
			type: Function,
			required: false,
			default: void 0
		},
		isDateHighlightable: {
			type: Function,
			required: false,
			default: void 0
		},
		dir: {
			type: String,
			required: false
		},
		nextPage: {
			type: Function,
			required: false
		},
		prevPage: {
			type: Function,
			required: false
		},
		disableDaysOutsideCurrentView: {
			type: Boolean,
			required: false,
			default: false
		},
		fixedDate: {
			type: String,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "div"
		}
	},
	emits: [
		"update:modelValue",
		"update:validModelValue",
		"update:placeholder",
		"update:startValue"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { disabled, readonly, initialFocus, pagedNavigation, weekStartsOn, weekdayFormat, fixedWeeks, numberOfMonths, preventDeselect, isDateUnavailable: propsIsDateUnavailable, isDateHighlightable: propsIsDateHighlightable, isDateDisabled: propsIsDateDisabled, calendarLabel, maxValue, minValue, dir: propDir, locale: propLocale, nextPage: propsNextPage, prevPage: propsPrevPage, allowNonContiguousRanges, disableDaysOutsideCurrentView, fixedDate, maximumDays } = toRefs(props);
		const { primitiveElement, currentElement: parentElement } = usePrimitiveElement();
		const dir = useDirection(propDir);
		const locale = useLocale(propLocale);
		const lastPressedDateValue = ref();
		const focusedValue = ref();
		const isEditing = ref(false);
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? {
				start: void 0,
				end: void 0
			},
			passive: props.modelValue === void 0
		});
		const validModelValue = ref(modelValue.value);
		watch(validModelValue, (value) => {
			emits("update:validModelValue", value);
		});
		const defaultDate = getDefaultDate({
			defaultPlaceholder: props.placeholder,
			defaultValue: modelValue.value.start,
			locale: props.locale
		});
		const startValue = ref(modelValue.value.start);
		const endValue = ref(modelValue.value.end);
		const placeholder = useVModel(props, "placeholder", emits, {
			defaultValue: props.defaultPlaceholder ?? defaultDate.copy(),
			passive: props.placeholder === void 0
		});
		function onPlaceholderChange(value) {
			placeholder.value = value.copy();
		}
		const { fullCalendarLabel, headingValue, isDateDisabled, isDateUnavailable, isNextButtonDisabled, isPrevButtonDisabled, grid, weekdays, isOutsideVisibleView, nextPage, prevPage, formatter } = useCalendar({
			locale,
			placeholder,
			weekStartsOn,
			fixedWeeks,
			numberOfMonths,
			minValue,
			maxValue,
			disabled,
			weekdayFormat,
			pagedNavigation,
			isDateDisabled: propsIsDateDisabled.value,
			isDateUnavailable: propsIsDateUnavailable.value,
			calendarLabel,
			nextPage: propsNextPage,
			prevPage: propsPrevPage
		});
		const { isInvalid, isSelected, isDateHighlightable, highlightedRange, isSelectionStart, isSelectionEnd, isHighlightedStart, isHighlightedEnd, isDateDisabled: rangeIsDateDisabled } = useRangeCalendarState({
			start: startValue,
			end: endValue,
			isDateDisabled,
			isDateUnavailable,
			isDateHighlightable: propsIsDateHighlightable.value,
			focusedValue,
			allowNonContiguousRanges,
			fixedDate,
			maximumDays
		});
		watch(modelValue, (_modelValue, _prevValue) => {
			if (!_prevValue?.start && _modelValue?.start || !_modelValue || !_modelValue.start || startValue.value && !isEqualDay(_modelValue.start, startValue.value)) startValue.value = _modelValue?.start?.copy?.();
			if (!_prevValue?.end && _modelValue.end || !_modelValue || !_modelValue.end || endValue.value && !isEqualDay(_modelValue.end, endValue.value)) endValue.value = _modelValue?.end?.copy?.();
		});
		watch(startValue, (_startValue) => {
			if (_startValue && !isEqualDay(_startValue, placeholder.value)) onPlaceholderChange(_startValue);
			emits("update:startValue", _startValue);
		});
		watch([startValue, endValue], ([_startValue, _endValue]) => {
			const value = modelValue.value;
			if (value && value.start && value.end && _startValue && _endValue && isEqualDay(value.start, _startValue) && isEqualDay(value.end, _endValue)) return;
			isEditing.value = true;
			if (_endValue && _startValue) {
				if (isBefore(_endValue, _startValue)) modelValue.value = {
					start: _endValue.copy(),
					end: _startValue.copy()
				};
				else modelValue.value = {
					start: _startValue.copy(),
					end: _endValue.copy()
				};
				isEditing.value = false;
				validModelValue.value = {
					start: modelValue.value.start?.copy(),
					end: modelValue.value.end?.copy()
				};
			} else if (_startValue) modelValue.value = {
				start: _startValue.copy(),
				end: void 0
			};
			else modelValue.value = {
				start: _endValue?.copy(),
				end: void 0
			};
		});
		const kbd = useKbd();
		useEventListener("keydown", (ev) => {
			if (ev.key === kbd.ESCAPE && isEditing.value) {
				startValue.value = validModelValue.value.start?.copy();
				endValue.value = validModelValue.value.end?.copy();
			}
		});
		provideRangeCalendarRootContext({
			isDateUnavailable,
			isDateHighlightable,
			startValue,
			endValue,
			formatter,
			modelValue,
			placeholder,
			disabled,
			initialFocus,
			pagedNavigation,
			grid,
			weekDays: weekdays,
			weekStartsOn,
			weekdayFormat,
			fixedWeeks,
			numberOfMonths,
			readonly,
			preventDeselect,
			fullCalendarLabel,
			headingValue,
			isInvalid,
			isDateDisabled: rangeIsDateDisabled,
			allowNonContiguousRanges,
			highlightedRange,
			focusedValue,
			lastPressedDateValue,
			isSelected,
			isSelectionEnd,
			isSelectionStart,
			isNextButtonDisabled,
			isPrevButtonDisabled,
			isOutsideVisibleView,
			nextPage,
			prevPage,
			parentElement,
			onPlaceholderChange,
			locale,
			dir,
			isHighlightedStart,
			isHighlightedEnd,
			disableDaysOutsideCurrentView,
			fixedDate,
			maximumDays
		});
		onMounted(() => {
			if (initialFocus.value) handleCalendarInitialFocus(parentElement.value);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				as: _ctx.as,
				"as-child": _ctx.asChild,
				role: "application",
				"aria-label": unref(fullCalendarLabel),
				"data-readonly": unref(readonly) ? "" : void 0,
				"data-disabled": unref(disabled) ? "" : void 0,
				"data-invalid": unref(isInvalid) ? "" : void 0,
				dir: unref(dir)
			}, {
				default: withCtx(() => [createElementVNode("div", _hoisted_1, [createElementVNode("div", _hoisted_2, toDisplayString(unref(fullCalendarLabel)), 1)]), renderSlot(_ctx.$slots, "default", {
					date: unref(placeholder),
					grid: unref(grid),
					weekDays: unref(weekdays),
					weekStartsOn: unref(weekStartsOn),
					locale: unref(locale),
					fixedWeeks: unref(fixedWeeks),
					modelValue: unref(modelValue)
				})]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"aria-label",
				"data-readonly",
				"data-disabled",
				"data-invalid",
				"dir"
			]);
		};
	}
});

//#endregion
//#region src/RangeCalendar/RangeCalendarRoot.vue
var RangeCalendarRoot_default = RangeCalendarRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { RangeCalendarRoot_default, injectRangeCalendarRootContext };
//# sourceMappingURL=RangeCalendarRoot.js.map