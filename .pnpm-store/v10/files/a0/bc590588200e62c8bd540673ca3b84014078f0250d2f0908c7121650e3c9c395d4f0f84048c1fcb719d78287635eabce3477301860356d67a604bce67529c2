const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_date_comparators = require('../date/comparators.cjs');
const require_date_utils = require('../date/utils.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_shared_useKbd = require('../shared/useKbd.cjs');
const require_shared_useLocale = require('../shared/useLocale.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_MonthPicker_useMonthPicker = require('../MonthPicker/useMonthPicker.cjs');
const require_MonthRangePicker_useRangeMonthPicker = require('./useRangeMonthPicker.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/MonthRangePicker/MonthRangePickerRoot.vue?vue&type=script&setup=true&lang.ts
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
const [injectMonthRangePickerRootContext, provideMonthRangePickerRootContext] = require_shared_createContext.createContext("MonthRangePickerRoot");
var MonthRangePickerRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "MonthRangePickerRoot",
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
		maximumMonths: {
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
		isMonthDisabled: {
			type: Function,
			required: false,
			default: void 0
		},
		isMonthUnavailable: {
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
		const { disabled, readonly, initialFocus, preventDeselect, isMonthUnavailable: propsIsMonthUnavailable, isMonthDisabled: propsIsMonthDisabled, calendarLabel, maxValue, minValue, dir: propDir, locale: propLocale, nextPage: propsNextPage, prevPage: propsPrevPage, allowNonContiguousRanges, fixedDate, maximumMonths } = (0, vue.toRefs)(props);
		const { primitiveElement, currentElement: parentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const dir = require_shared_useDirection.useDirection(propDir);
		const locale = require_shared_useLocale.useLocale(propLocale);
		const headingId = require_shared_useId.useId(void 0, "reka-month-range-picker-heading");
		const lastPressedDateValue = (0, vue.ref)();
		const focusedValue = (0, vue.ref)();
		const isEditing = (0, vue.ref)(false);
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
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
		const normalizedModelValue = (0, vue.computed)(() => normalizeRange(modelValue.value));
		const validModelValue = (0, vue.ref)(normalizeRange(modelValue.value));
		const defaultDate = require_date_comparators.getDefaultDate({
			defaultPlaceholder: props.placeholder,
			defaultValue: normalizeRange(modelValue.value).start,
			locale: props.locale
		});
		const startValue = (0, vue.ref)(normalizeRange(modelValue.value).start);
		const endValue = (0, vue.ref)(normalizeRange(modelValue.value).end);
		const placeholder = (0, __vueuse_core.useVModel)(props, "placeholder", emits, {
			defaultValue: props.defaultPlaceholder ?? defaultDate.copy(),
			passive: props.placeholder === void 0
		});
		function onPlaceholderChange(value) {
			placeholder.value = value.copy();
		}
		const { fullCalendarLabel, headingValue, isMonthDisabled, isMonthUnavailable, isNextButtonDisabled, isPrevButtonDisabled, grid, nextPage, prevPage, formatter } = require_MonthPicker_useMonthPicker.useMonthPicker({
			locale,
			placeholder,
			minValue,
			maxValue,
			disabled,
			isMonthDisabled: propsIsMonthDisabled,
			isMonthUnavailable: propsIsMonthUnavailable,
			calendarLabel,
			nextPage: propsNextPage,
			prevPage: propsPrevPage
		});
		const { isInvalid, isSelected, highlightedRange, isSelectionStart, isSelectionEnd, isHighlightedStart, isHighlightedEnd, isMonthDisabled: rangeIsMonthDisabled } = require_MonthRangePicker_useRangeMonthPicker.useRangeMonthPickerState({
			start: startValue,
			end: endValue,
			isMonthDisabled,
			isMonthUnavailable,
			focusedValue,
			allowNonContiguousRanges,
			fixedDate,
			maximumMonths
		});
		(0, vue.watch)(modelValue, (_modelValue) => {
			const next = normalizeRange(_modelValue);
			const isStartSynced = !next.start && !startValue.value || !!next.start && !!startValue.value && require_date_comparators.isSameYearMonth(next.start, startValue.value);
			if (!isStartSynced) startValue.value = next.start?.copy?.();
			const isEndSynced = !next.end && !endValue.value || !!next.end && !!endValue.value && require_date_comparators.isSameYearMonth(next.end, endValue.value);
			if (!isEndSynced) endValue.value = next.end?.copy?.();
			if (next.start && next.end) validModelValue.value = {
				start: next.start.copy(),
				end: next.end.copy()
			};
		});
		(0, vue.watch)(startValue, (_startValue) => {
			if (_startValue && !require_date_comparators.isSameYearMonth(_startValue, placeholder.value)) onPlaceholderChange(_startValue);
			emits("update:startValue", _startValue);
		});
		(0, vue.watch)([startValue, endValue], ([_startValue, _endValue]) => {
			const value = modelValue.value;
			if (value && value.start && value.end && _startValue && _endValue && require_date_comparators.isSameYearMonth(value.start, _startValue) && require_date_comparators.isSameYearMonth(value.end, _endValue)) return;
			isEditing.value = true;
			if (_endValue && _startValue) {
				const nextValue = require_date_comparators.compareYearMonth(_endValue, _startValue) < 0 ? {
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
		const kbd = require_shared_useKbd.useKbd();
		(0, __vueuse_core.useEventListener)(parentElement, "keydown", (ev) => {
			if (ev.key === kbd.ESCAPE && isEditing.value) {
				startValue.value = validModelValue.value.start?.copy();
				endValue.value = validModelValue.value.end?.copy();
			}
		});
		provideMonthRangePickerRootContext({
			isMonthUnavailable,
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
			isMonthDisabled: rangeIsMonthDisabled,
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
			maximumMonths,
			minValue,
			maxValue
		});
		(0, vue.onMounted)(() => {
			if (initialFocus.value) require_date_utils.handleCalendarInitialFocus(parentElement.value);
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"aria-label": (0, vue.unref)(fullCalendarLabel),
				"data-readonly": (0, vue.unref)(readonly) ? "" : void 0,
				"data-disabled": (0, vue.unref)(disabled) ? "" : void 0,
				"data-invalid": (0, vue.unref)(isInvalid) ? "" : void 0,
				dir: (0, vue.unref)(dir)
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createElementVNode)("div", _hoisted_1, [(0, vue.createElementVNode)("div", _hoisted_2, (0, vue.toDisplayString)((0, vue.unref)(fullCalendarLabel)), 1)]), (0, vue.renderSlot)(_ctx.$slots, "default", {
					date: (0, vue.unref)(placeholder),
					grid: (0, vue.unref)(grid),
					locale: (0, vue.unref)(locale),
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
//#region src/MonthRangePicker/MonthRangePickerRoot.vue
var MonthRangePickerRoot_default = MonthRangePickerRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MonthRangePickerRoot_default', {
  enumerable: true,
  get: function () {
    return MonthRangePickerRoot_default;
  }
});
Object.defineProperty(exports, 'injectMonthRangePickerRootContext', {
  enumerable: true,
  get: function () {
    return injectMonthRangePickerRootContext;
  }
});
//# sourceMappingURL=MonthRangePickerRoot.cjs.map