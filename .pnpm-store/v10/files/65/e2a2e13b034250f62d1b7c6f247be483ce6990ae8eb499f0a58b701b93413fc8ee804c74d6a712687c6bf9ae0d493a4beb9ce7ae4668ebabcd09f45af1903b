import { createContext } from "../shared/createContext.js";
import { getDefaultDate, isBefore } from "../date/comparators.js";
import { handleCalendarInitialFocus } from "../date/utils.js";
import { getWeekStartsOn } from "../date/calendar.js";
import { useDirection } from "../shared/useDirection.js";
import { useKbd } from "../shared/useKbd.js";
import { useLocale } from "../shared/useLocale.js";
import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { useCalendar } from "../Calendar/useCalendar.js";
import { useRangeCalendarState } from "./useRangeCalendar.js";
import { computed, createBlock, createElementVNode, defineComponent, onMounted, openBlock, ref, renderSlot, toDisplayString, toRefs, unref, watch, withCtx } from "vue";
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
			required: false
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
		const { disabled, readonly, initialFocus, pagedNavigation, weekdayFormat, fixedWeeks, numberOfMonths, preventDeselect, isDateUnavailable: propsIsDateUnavailable, isDateHighlightable: propsIsDateHighlightable, isDateDisabled: propsIsDateDisabled, calendarLabel, maxValue, minValue, dir: propDir, locale: propLocale, nextPage: propsNextPage, prevPage: propsPrevPage, allowNonContiguousRanges, disableDaysOutsideCurrentView, fixedDate, maximumDays } = toRefs(props);
		const { primitiveElement, currentElement: parentElement } = usePrimitiveElement();
		const dir = useDirection(propDir);
		const locale = useLocale(propLocale);
		const weekStartsOn = computed(() => props.weekStartsOn ?? getWeekStartsOn(locale.value));
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
		const normalizeRange = (value) => value ?? {
			start: void 0,
			end: void 0
		};
		const normalizedModelValue = computed(() => normalizeRange(modelValue.value));
		const validModelValue = ref(normalizeRange(modelValue.value));
		watch(validModelValue, (value) => {
			emits("update:validModelValue", value);
		});
		const defaultDate = getDefaultDate({
			defaultPlaceholder: props.placeholder,
			defaultValue: normalizeRange(modelValue.value).start,
			locale: props.locale
		});
		const startValue = ref(normalizeRange(modelValue.value).start);
		const endValue = ref(normalizeRange(modelValue.value).end);
		const placeholder = useVModel(props, "placeholder", emits, {
			defaultValue: props.defaultPlaceholder ?? defaultDate.copy(),
			passive: props.placeholder === void 0
		});
		function onPlaceholderChange(value) {
			placeholder.value = value.copy();
		}
		const { fullCalendarLabel, headingValue, isDateDisabled, isDateUnavailable, isNextButtonDisabled, isPrevButtonDisabled, grid, weekdays, isOutsideVisibleView, nextPage, prevPage, formatter, isPlaceholderFocusable, firstFocusableDate } = useCalendar({
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
		const { isInvalid, isSelected, isDateHighlightable, highlightedRange, isSelectionStart, isSelectionEnd, isHighlightedStart, isHighlightedEnd, isDateDisabled: rangeIsDateDisabled, hasSelectedDate, isSelectedDisabled, selectedFocusableDate } = useRangeCalendarState({
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
		watch(modelValue, (_modelValue) => {
			const next = normalizeRange(_modelValue);
			const isStartSynced = !next.start && !startValue.value || !!next.start && !!startValue.value && isEqualDay(next.start, startValue.value);
			if (!isStartSynced) startValue.value = next.start?.copy?.();
			const isEndSynced = !next.end && !endValue.value || !!next.end && !!endValue.value && isEqualDay(next.end, endValue.value);
			if (!isEndSynced) endValue.value = next.end?.copy?.();
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
				const nextValue = isBefore(_endValue, _startValue) ? {
					start: _endValue.copy(),
					end: _startValue.copy()
				} : {
					start: _startValue.copy(),
					end: _endValue.copy()
				};
				modelValue.value = {
					start: nextValue.start,
					end: nextValue.end
				};
				isEditing.value = false;
				validModelValue.value = {
					start: nextValue.start.copy(),
					end: nextValue.end.copy()
				};
			} else modelValue.value = _startValue ? {
				start: _startValue.copy(),
				end: void 0
			} : {
				start: _endValue?.copy(),
				end: void 0
			};
		});
		const kbd = useKbd();
		useEventListener(parentElement, "keydown", (ev) => {
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
			modelValue: normalizedModelValue,
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
			maximumDays,
			minValue,
			maxValue,
			isPlaceholderFocusable,
			firstFocusableDate,
			hasSelectedDate,
			isSelectedDisabled,
			selectedFocusableDate
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
					weekStartsOn: weekStartsOn.value,
					locale: unref(locale),
					fixedWeeks: unref(fixedWeeks),
					modelValue: normalizedModelValue.value
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