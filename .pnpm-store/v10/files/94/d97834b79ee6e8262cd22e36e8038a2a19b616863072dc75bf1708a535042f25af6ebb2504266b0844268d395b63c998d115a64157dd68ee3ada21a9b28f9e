import { createContext } from "../shared/createContext.js";
import { getDefaultDate, isSameYear } from "../date/comparators.js";
import { handleCalendarInitialFocus } from "../date/utils.js";
import { useDirection } from "../shared/useDirection.js";
import { useId } from "../shared/useId.js";
import { useKbd } from "../shared/useKbd.js";
import { useLocale } from "../shared/useLocale.js";
import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { useYearPicker } from "../YearPicker/useYearPicker.js";
import { useRangeYearPickerState } from "./useRangeYearPicker.js";
import { computed, createBlock, createElementVNode, defineComponent, onMounted, openBlock, ref, renderSlot, toDisplayString, toRefs, unref, watch, withCtx } from "vue";
import { useEventListener, useVModel } from "@vueuse/core";

//#region src/YearRangePicker/YearRangePickerRoot.vue?vue&type=script&setup=true&lang.ts
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
const [injectYearRangePickerRootContext, provideYearRangePickerRootContext] = createContext("YearRangePickerRoot");
var YearRangePickerRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "YearRangePickerRoot",
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
		preventDeselect: {
			type: Boolean,
			required: false,
			default: false
		},
		maximumYears: {
			type: Number,
			required: false,
			default: void 0
		},
		calendarLabel: {
			type: String,
			required: false
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
		isYearDisabled: {
			type: Function,
			required: false,
			default: void 0
		},
		isYearUnavailable: {
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
		fixedDate: {
			type: String,
			required: false
		},
		yearsPerPage: {
			type: Number,
			required: false,
			default: 12
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
		"update:placeholder",
		"update:startValue"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { disabled, readonly, initialFocus, preventDeselect, isYearUnavailable: propsIsYearUnavailable, isYearDisabled: propsIsYearDisabled, calendarLabel, maxValue, minValue, dir: propDir, locale: propLocale, nextPage: propsNextPage, prevPage: propsPrevPage, allowNonContiguousRanges, fixedDate, maximumYears, yearsPerPage } = toRefs(props);
		const { primitiveElement, currentElement: parentElement } = usePrimitiveElement();
		const dir = useDirection(propDir);
		const locale = useLocale(propLocale);
		const headingId = useId(void 0, "reka-year-range-picker-heading");
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
		const { fullCalendarLabel, headingValue, isYearDisabled, isYearUnavailable, isNextButtonDisabled, isPrevButtonDisabled, grid, nextPage, prevPage, formatter } = useYearPicker({
			locale,
			placeholder,
			minValue,
			maxValue,
			disabled,
			yearsPerPage,
			isYearDisabled: propsIsYearDisabled,
			isYearUnavailable: propsIsYearUnavailable,
			calendarLabel,
			nextPage: propsNextPage,
			prevPage: propsPrevPage
		});
		const { isInvalid, isSelected, highlightedRange, isSelectionStart, isSelectionEnd, isHighlightedStart, isHighlightedEnd, isYearDisabled: rangeIsYearDisabled } = useRangeYearPickerState({
			start: startValue,
			end: endValue,
			isYearDisabled,
			isYearUnavailable,
			focusedValue,
			allowNonContiguousRanges,
			fixedDate,
			maximumYears
		});
		watch(modelValue, (_modelValue) => {
			const next = normalizeRange(_modelValue);
			const isStartSynced = !next.start && !startValue.value || !!next.start && !!startValue.value && isSameYear(next.start, startValue.value);
			if (!isStartSynced) startValue.value = next.start?.copy?.();
			const isEndSynced = !next.end && !endValue.value || !!next.end && !!endValue.value && isSameYear(next.end, endValue.value);
			if (!isEndSynced) endValue.value = next.end?.copy?.();
		});
		watch(startValue, (_startValue) => {
			if (_startValue && !isSameYear(_startValue, placeholder.value)) onPlaceholderChange(_startValue);
			emits("update:startValue", _startValue);
		});
		watch([startValue, endValue], ([_startValue, _endValue]) => {
			const value = modelValue.value;
			if (value && value.start && value.end && _startValue && _endValue && isSameYear(value.start, _startValue) && isSameYear(value.end, _endValue)) return;
			isEditing.value = true;
			if (_endValue && _startValue) {
				const nextValue = _endValue.year < _startValue.year ? {
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
		provideYearRangePickerRootContext({
			isYearUnavailable,
			startValue,
			endValue,
			formatter,
			modelValue: normalizedModelValue,
			placeholder,
			disabled,
			initialFocus,
			grid,
			readonly,
			preventDeselect,
			fullCalendarLabel,
			headingValue,
			headingId,
			isInvalid,
			isYearDisabled: rangeIsYearDisabled,
			allowNonContiguousRanges,
			highlightedRange,
			focusedValue,
			lastPressedDateValue,
			isSelected,
			isSelectionEnd,
			isSelectionStart,
			isNextButtonDisabled,
			isPrevButtonDisabled,
			nextPage,
			prevPage,
			parentElement,
			onPlaceholderChange,
			locale,
			dir,
			isHighlightedStart,
			isHighlightedEnd,
			fixedDate,
			maximumYears,
			minValue,
			maxValue,
			yearsPerPage
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
					locale: unref(locale),
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
//#region src/YearRangePicker/YearRangePickerRoot.vue
var YearRangePickerRoot_default = YearRangePickerRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { YearRangePickerRoot_default, injectYearRangePickerRootContext };
//# sourceMappingURL=YearRangePickerRoot.js.map