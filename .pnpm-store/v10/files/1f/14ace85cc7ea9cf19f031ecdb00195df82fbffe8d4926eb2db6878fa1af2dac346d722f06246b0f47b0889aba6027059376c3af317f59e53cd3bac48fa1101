const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_date_comparators = require('../date/comparators.cjs');
const require_date_utils = require('../date/utils.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useLocale = require('../shared/useLocale.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_Calendar_useCalendar = require('./useCalendar.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));
const __internationalized_date = require_rolldown_runtime.__toESM(require("@internationalized/date"));

//#region src/Calendar/CalendarRoot.vue?vue&type=script&setup=true&lang.ts
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
const [injectCalendarRootContext, provideCalendarRootContext] = require_shared_createContext.createContext("CalendarRoot");
var CalendarRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "CalendarRoot",
	props: {
		defaultValue: {
			type: null,
			required: false,
			default: void 0
		},
		defaultPlaceholder: {
			type: null,
			required: false
		},
		placeholder: {
			type: null,
			required: false,
			default: void 0
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
		modelValue: {
			type: null,
			required: false
		},
		multiple: {
			type: Boolean,
			required: false,
			default: false
		},
		disableDaysOutsideCurrentView: {
			type: Boolean,
			required: false,
			default: false
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
	emits: ["update:modelValue", "update:placeholder"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { disabled, readonly, initialFocus, pagedNavigation, weekStartsOn, weekdayFormat, fixedWeeks, multiple, minValue, maxValue, numberOfMonths, preventDeselect, isDateDisabled: propsIsDateDisabled, isDateUnavailable: propsIsDateUnavailable, calendarLabel, defaultValue, nextPage: propsNextPage, prevPage: propsPrevPage, dir: propDir, locale: propLocale, disableDaysOutsideCurrentView } = (0, vue.toRefs)(props);
		const { primitiveElement, currentElement: parentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const locale = require_shared_useLocale.useLocale(propLocale);
		const dir = require_shared_useDirection.useDirection(propDir);
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: defaultValue.value,
			passive: props.modelValue === void 0
		});
		const defaultDate = require_date_comparators.getDefaultDate({
			defaultPlaceholder: props.placeholder,
			defaultValue: modelValue.value,
			locale: props.locale
		});
		const placeholder = (0, __vueuse_core.useVModel)(props, "placeholder", emits, {
			defaultValue: props.defaultPlaceholder ?? defaultDate.copy(),
			passive: props.placeholder === void 0
		});
		function onPlaceholderChange(value) {
			placeholder.value = value.copy();
		}
		const { fullCalendarLabel, headingValue, isDateDisabled, isDateUnavailable, isNextButtonDisabled, isPrevButtonDisabled, weekdays, isOutsideVisibleView, nextPage, prevPage, formatter, grid } = require_Calendar_useCalendar.useCalendar({
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
		const { isInvalid, isDateSelected } = require_Calendar_useCalendar.useCalendarState({
			date: modelValue,
			isDateDisabled,
			isDateUnavailable
		});
		(0, vue.watch)(modelValue, (_modelValue) => {
			if (Array.isArray(_modelValue) && _modelValue.length) {
				const lastValue = _modelValue[_modelValue.length - 1];
				if (lastValue && !(0, __internationalized_date.isEqualDay)(placeholder.value, lastValue)) onPlaceholderChange(lastValue);
			} else if (!Array.isArray(_modelValue) && _modelValue && !(0, __internationalized_date.isEqualDay)(placeholder.value, _modelValue)) onPlaceholderChange(_modelValue);
		});
		function onDateChange(value) {
			if (!multiple.value) {
				if (!modelValue.value) {
					modelValue.value = value.copy();
					return;
				}
				if (!preventDeselect.value && (0, __internationalized_date.isEqualDay)(modelValue.value, value)) {
					placeholder.value = value.copy();
					modelValue.value = void 0;
				} else modelValue.value = value.copy();
			} else if (!modelValue.value) modelValue.value = [value.copy()];
			else if (Array.isArray(modelValue.value)) {
				const index = modelValue.value.findIndex((date) => (0, __internationalized_date.isSameDay)(date, value));
				if (index === -1) modelValue.value = [...modelValue.value, value];
				else if (!preventDeselect.value) {
					const next = modelValue.value.filter((date) => !(0, __internationalized_date.isSameDay)(date, value));
					if (!next.length) {
						placeholder.value = value.copy();
						modelValue.value = void 0;
						return;
					}
					modelValue.value = next.map((date) => date.copy());
				}
			}
		}
		(0, vue.onMounted)(() => {
			if (initialFocus.value) require_date_utils.handleCalendarInitialFocus(parentElement.value);
		});
		provideCalendarRootContext({
			isDateUnavailable,
			dir,
			isDateDisabled,
			locale,
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
			multiple,
			numberOfMonths,
			readonly,
			preventDeselect,
			fullCalendarLabel,
			headingValue,
			isInvalid,
			isDateSelected,
			isNextButtonDisabled,
			isPrevButtonDisabled,
			isOutsideVisibleView,
			nextPage,
			prevPage,
			parentElement,
			onPlaceholderChange,
			onDateChange,
			disableDaysOutsideCurrentView
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
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
					date: (0, vue.unref)(placeholder),
					grid: (0, vue.unref)(grid),
					weekDays: (0, vue.unref)(weekdays),
					weekStartsOn: (0, vue.unref)(weekStartsOn),
					locale: (0, vue.unref)(locale),
					fixedWeeks: (0, vue.unref)(fixedWeeks),
					modelValue: (0, vue.unref)(modelValue)
				}), (0, vue.createElementVNode)("div", _hoisted_1, [(0, vue.createElementVNode)("div", _hoisted_2, (0, vue.toDisplayString)((0, vue.unref)(fullCalendarLabel)), 1)])]),
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
//#region src/Calendar/CalendarRoot.vue
var CalendarRoot_default = CalendarRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'CalendarRoot_default', {
  enumerable: true,
  get: function () {
    return CalendarRoot_default;
  }
});
Object.defineProperty(exports, 'injectCalendarRootContext', {
  enumerable: true,
  get: function () {
    return injectCalendarRootContext;
  }
});
//# sourceMappingURL=CalendarRoot.cjs.map