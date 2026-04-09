const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_date_comparators = require('../date/comparators.cjs');
const require_date_utils = require('../date/utils.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_shared_useLocale = require('../shared/useLocale.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_MonthPicker_useMonthPicker = require('./useMonthPicker.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/MonthPicker/MonthPickerRoot.vue?vue&type=script&setup=true&lang.ts
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
const [injectMonthPickerRootContext, provideMonthPickerRootContext] = require_shared_createContext.createContext("MonthPickerRoot");
var MonthPickerRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "MonthPickerRoot",
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
		preventDeselect: {
			type: Boolean,
			required: false,
			default: false
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
		modelValue: {
			type: null,
			required: false
		},
		multiple: {
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
		const { disabled, readonly, initialFocus, multiple, minValue, maxValue, preventDeselect, isMonthDisabled: propsIsMonthDisabled, isMonthUnavailable: propsIsMonthUnavailable, calendarLabel, defaultValue, nextPage: propsNextPage, prevPage: propsPrevPage, dir: propDir, locale: propLocale } = (0, vue.toRefs)(props);
		const { primitiveElement, currentElement: parentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const locale = require_shared_useLocale.useLocale(propLocale);
		const dir = require_shared_useDirection.useDirection(propDir);
		const headingId = require_shared_useId.useId(void 0, "reka-month-picker-heading");
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
		const { fullCalendarLabel, headingValue, isMonthDisabled, isMonthUnavailable, isNextButtonDisabled, isPrevButtonDisabled, nextPage, prevPage, formatter, grid } = require_MonthPicker_useMonthPicker.useMonthPicker({
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
		const { isInvalid, isMonthSelected } = require_MonthPicker_useMonthPicker.useMonthPickerState({
			date: modelValue,
			isMonthDisabled,
			isMonthUnavailable
		});
		(0, vue.watch)(modelValue, (_modelValue) => {
			if (Array.isArray(_modelValue) && _modelValue.length) {
				const lastValue = _modelValue[_modelValue.length - 1];
				if (lastValue && !require_date_comparators.isSameYearMonth(placeholder.value, lastValue)) onPlaceholderChange(lastValue);
			} else if (!Array.isArray(_modelValue) && _modelValue && !require_date_comparators.isSameYearMonth(placeholder.value, _modelValue)) onPlaceholderChange(_modelValue);
		});
		function onMonthChange(value) {
			if (!multiple.value) {
				if (!modelValue.value) {
					modelValue.value = value.copy();
					return;
				}
				if (!preventDeselect.value && require_date_comparators.isSameYearMonth(modelValue.value, value)) {
					placeholder.value = value.copy();
					modelValue.value = void 0;
				} else modelValue.value = value.copy();
			} else if (!modelValue.value) modelValue.value = [value.copy()];
			else {
				const modelValueArray = Array.isArray(modelValue.value) ? modelValue.value : [modelValue.value];
				const index = modelValueArray.findIndex((date) => require_date_comparators.isSameYearMonth(date, value));
				if (index === -1) modelValue.value = [...modelValueArray, value.copy()];
				else if (!preventDeselect.value) {
					const next = modelValueArray.filter((date) => !require_date_comparators.isSameYearMonth(date, value));
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
		provideMonthPickerRootContext({
			isMonthUnavailable,
			dir,
			isMonthDisabled,
			locale,
			formatter,
			modelValue,
			placeholder,
			disabled,
			initialFocus,
			grid,
			multiple,
			readonly,
			preventDeselect,
			fullCalendarLabel,
			headingValue,
			headingId,
			isInvalid,
			isMonthSelected,
			isNextButtonDisabled,
			isPrevButtonDisabled,
			nextPage,
			prevPage,
			parentElement,
			onPlaceholderChange,
			onMonthChange,
			minValue,
			maxValue
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
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
					date: (0, vue.unref)(placeholder),
					grid: (0, vue.unref)(grid),
					locale: (0, vue.unref)(locale),
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
//#region src/MonthPicker/MonthPickerRoot.vue
var MonthPickerRoot_default = MonthPickerRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MonthPickerRoot_default', {
  enumerable: true,
  get: function () {
    return MonthPickerRoot_default;
  }
});
Object.defineProperty(exports, 'injectMonthPickerRootContext', {
  enumerable: true,
  get: function () {
    return injectMonthPickerRootContext;
  }
});
//# sourceMappingURL=MonthPickerRoot.cjs.map