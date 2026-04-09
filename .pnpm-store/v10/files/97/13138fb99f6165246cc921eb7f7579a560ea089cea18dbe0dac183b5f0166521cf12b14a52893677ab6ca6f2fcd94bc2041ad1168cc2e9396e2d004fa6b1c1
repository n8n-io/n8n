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
const require_YearPicker_useYearPicker = require('../YearPicker/useYearPicker.cjs');
const require_YearRangePicker_useRangeYearPicker = require('./useRangeYearPicker.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

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
const [injectYearRangePickerRootContext, provideYearRangePickerRootContext] = require_shared_createContext.createContext("YearRangePickerRoot");
var YearRangePickerRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const { disabled, readonly, initialFocus, preventDeselect, isYearUnavailable: propsIsYearUnavailable, isYearDisabled: propsIsYearDisabled, calendarLabel, maxValue, minValue, dir: propDir, locale: propLocale, nextPage: propsNextPage, prevPage: propsPrevPage, allowNonContiguousRanges, fixedDate, maximumYears, yearsPerPage } = (0, vue.toRefs)(props);
		const { primitiveElement, currentElement: parentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const dir = require_shared_useDirection.useDirection(propDir);
		const locale = require_shared_useLocale.useLocale(propLocale);
		const headingId = require_shared_useId.useId(void 0, "reka-year-range-picker-heading");
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
		const { fullCalendarLabel, headingValue, isYearDisabled, isYearUnavailable, isNextButtonDisabled, isPrevButtonDisabled, grid, nextPage, prevPage, formatter } = require_YearPicker_useYearPicker.useYearPicker({
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
		const { isInvalid, isSelected, highlightedRange, isSelectionStart, isSelectionEnd, isHighlightedStart, isHighlightedEnd, isYearDisabled: rangeIsYearDisabled } = require_YearRangePicker_useRangeYearPicker.useRangeYearPickerState({
			start: startValue,
			end: endValue,
			isYearDisabled,
			isYearUnavailable,
			focusedValue,
			allowNonContiguousRanges,
			fixedDate,
			maximumYears
		});
		(0, vue.watch)(modelValue, (_modelValue) => {
			const next = normalizeRange(_modelValue);
			const isStartSynced = !next.start && !startValue.value || !!next.start && !!startValue.value && require_date_comparators.isSameYear(next.start, startValue.value);
			if (!isStartSynced) startValue.value = next.start?.copy?.();
			const isEndSynced = !next.end && !endValue.value || !!next.end && !!endValue.value && require_date_comparators.isSameYear(next.end, endValue.value);
			if (!isEndSynced) endValue.value = next.end?.copy?.();
		});
		(0, vue.watch)(startValue, (_startValue) => {
			if (_startValue && !require_date_comparators.isSameYear(_startValue, placeholder.value)) onPlaceholderChange(_startValue);
			emits("update:startValue", _startValue);
		});
		(0, vue.watch)([startValue, endValue], ([_startValue, _endValue]) => {
			const value = modelValue.value;
			if (value && value.start && value.end && _startValue && _endValue && require_date_comparators.isSameYear(value.start, _startValue) && require_date_comparators.isSameYear(value.end, _endValue)) return;
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
		const kbd = require_shared_useKbd.useKbd();
		(0, __vueuse_core.useEventListener)(parentElement, "keydown", (ev) => {
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
//#region src/YearRangePicker/YearRangePickerRoot.vue
var YearRangePickerRoot_default = YearRangePickerRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'YearRangePickerRoot_default', {
  enumerable: true,
  get: function () {
    return YearRangePickerRoot_default;
  }
});
Object.defineProperty(exports, 'injectYearRangePickerRootContext', {
  enumerable: true,
  get: function () {
    return injectYearRangePickerRootContext;
  }
});
//# sourceMappingURL=YearRangePickerRoot.cjs.map