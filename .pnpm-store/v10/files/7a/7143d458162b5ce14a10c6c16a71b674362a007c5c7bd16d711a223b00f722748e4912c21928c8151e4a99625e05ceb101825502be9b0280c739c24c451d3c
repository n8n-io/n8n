const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_date_comparators = require('../date/comparators.cjs');
const require_date_utils = require('../date/utils.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useKbd = require('../shared/useKbd.cjs');
const require_shared_useLocale = require('../shared/useLocale.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_Calendar_useCalendar = require('../Calendar/useCalendar.cjs');
const require_RangeCalendar_useRangeCalendar = require('./useRangeCalendar.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));
const __internationalized_date = require_rolldown_runtime.__toESM(require("@internationalized/date"));

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
const [injectRangeCalendarRootContext, provideRangeCalendarRootContext] = require_shared_createContext.createContext("RangeCalendarRoot");
var RangeCalendarRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const { disabled, readonly, initialFocus, pagedNavigation, weekStartsOn, weekdayFormat, fixedWeeks, numberOfMonths, preventDeselect, isDateUnavailable: propsIsDateUnavailable, isDateHighlightable: propsIsDateHighlightable, isDateDisabled: propsIsDateDisabled, calendarLabel, maxValue, minValue, dir: propDir, locale: propLocale, nextPage: propsNextPage, prevPage: propsPrevPage, allowNonContiguousRanges, disableDaysOutsideCurrentView, fixedDate, maximumDays } = (0, vue.toRefs)(props);
		const { primitiveElement, currentElement: parentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const dir = require_shared_useDirection.useDirection(propDir);
		const locale = require_shared_useLocale.useLocale(propLocale);
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
		const validModelValue = (0, vue.ref)(modelValue.value);
		(0, vue.watch)(validModelValue, (value) => {
			emits("update:validModelValue", value);
		});
		const defaultDate = require_date_comparators.getDefaultDate({
			defaultPlaceholder: props.placeholder,
			defaultValue: modelValue.value.start,
			locale: props.locale
		});
		const startValue = (0, vue.ref)(modelValue.value.start);
		const endValue = (0, vue.ref)(modelValue.value.end);
		const placeholder = (0, __vueuse_core.useVModel)(props, "placeholder", emits, {
			defaultValue: props.defaultPlaceholder ?? defaultDate.copy(),
			passive: props.placeholder === void 0
		});
		function onPlaceholderChange(value) {
			placeholder.value = value.copy();
		}
		const { fullCalendarLabel, headingValue, isDateDisabled, isDateUnavailable, isNextButtonDisabled, isPrevButtonDisabled, grid, weekdays, isOutsideVisibleView, nextPage, prevPage, formatter } = require_Calendar_useCalendar.useCalendar({
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
		const { isInvalid, isSelected, isDateHighlightable, highlightedRange, isSelectionStart, isSelectionEnd, isHighlightedStart, isHighlightedEnd, isDateDisabled: rangeIsDateDisabled } = require_RangeCalendar_useRangeCalendar.useRangeCalendarState({
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
		(0, vue.watch)(modelValue, (_modelValue, _prevValue) => {
			if (!_prevValue?.start && _modelValue?.start || !_modelValue || !_modelValue.start || startValue.value && !(0, __internationalized_date.isEqualDay)(_modelValue.start, startValue.value)) startValue.value = _modelValue?.start?.copy?.();
			if (!_prevValue?.end && _modelValue.end || !_modelValue || !_modelValue.end || endValue.value && !(0, __internationalized_date.isEqualDay)(_modelValue.end, endValue.value)) endValue.value = _modelValue?.end?.copy?.();
		});
		(0, vue.watch)(startValue, (_startValue) => {
			if (_startValue && !(0, __internationalized_date.isEqualDay)(_startValue, placeholder.value)) onPlaceholderChange(_startValue);
			emits("update:startValue", _startValue);
		});
		(0, vue.watch)([startValue, endValue], ([_startValue, _endValue]) => {
			const value = modelValue.value;
			if (value && value.start && value.end && _startValue && _endValue && (0, __internationalized_date.isEqualDay)(value.start, _startValue) && (0, __internationalized_date.isEqualDay)(value.end, _endValue)) return;
			isEditing.value = true;
			if (_endValue && _startValue) {
				if (require_date_comparators.isBefore(_endValue, _startValue)) modelValue.value = {
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
		const kbd = require_shared_useKbd.useKbd();
		(0, __vueuse_core.useEventListener)("keydown", (ev) => {
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
		(0, vue.onMounted)(() => {
			if (initialFocus.value) require_date_utils.handleCalendarInitialFocus(parentElement.value);
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				as: _ctx.as,
				"as-child": _ctx.asChild,
				role: "application",
				"aria-label": (0, vue.unref)(fullCalendarLabel),
				"data-readonly": (0, vue.unref)(readonly) ? "" : void 0,
				"data-disabled": (0, vue.unref)(disabled) ? "" : void 0,
				"data-invalid": (0, vue.unref)(isInvalid) ? "" : void 0,
				dir: (0, vue.unref)(dir)
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createElementVNode)("div", _hoisted_1, [(0, vue.createElementVNode)("div", _hoisted_2, (0, vue.toDisplayString)((0, vue.unref)(fullCalendarLabel)), 1)]), (0, vue.renderSlot)(_ctx.$slots, "default", {
					date: (0, vue.unref)(placeholder),
					grid: (0, vue.unref)(grid),
					weekDays: (0, vue.unref)(weekdays),
					weekStartsOn: (0, vue.unref)(weekStartsOn),
					locale: (0, vue.unref)(locale),
					fixedWeeks: (0, vue.unref)(fixedWeeks),
					modelValue: (0, vue.unref)(modelValue)
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
Object.defineProperty(exports, 'RangeCalendarRoot_default', {
  enumerable: true,
  get: function () {
    return RangeCalendarRoot_default;
  }
});
Object.defineProperty(exports, 'injectRangeCalendarRootContext', {
  enumerable: true,
  get: function () {
    return injectRangeCalendarRootContext;
  }
});
//# sourceMappingURL=RangeCalendarRoot.cjs.map