const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_date_comparators = require('../date/comparators.cjs');
const require_date_utils = require('../date/utils.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_shared_useLocale = require('../shared/useLocale.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_YearPicker_useYearPicker = require('./useYearPicker.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/YearPicker/YearPickerRoot.vue?vue&type=script&setup=true&lang.ts
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
const [injectYearPickerRootContext, provideYearPickerRootContext] = require_shared_createContext.createContext("YearPickerRoot");
var YearPickerRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "YearPickerRoot",
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
		modelValue: {
			type: null,
			required: false
		},
		multiple: {
			type: Boolean,
			required: false,
			default: false
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
	emits: ["update:modelValue", "update:placeholder"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { disabled, readonly, initialFocus, multiple, minValue, maxValue, preventDeselect, isYearDisabled: propsIsYearDisabled, isYearUnavailable: propsIsYearUnavailable, calendarLabel, defaultValue, nextPage: propsNextPage, prevPage: propsPrevPage, dir: propDir, locale: propLocale, yearsPerPage } = (0, vue.toRefs)(props);
		const { primitiveElement, currentElement: parentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const locale = require_shared_useLocale.useLocale(propLocale);
		const dir = require_shared_useDirection.useDirection(propDir);
		const headingId = require_shared_useId.useId(void 0, "reka-year-picker-heading");
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
		const { fullCalendarLabel, headingValue, isYearDisabled, isYearUnavailable, isNextButtonDisabled, isPrevButtonDisabled, nextPage, prevPage, formatter, grid } = require_YearPicker_useYearPicker.useYearPicker({
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
		const { isInvalid, isYearSelected } = require_YearPicker_useYearPicker.useYearPickerState({
			date: modelValue,
			isYearDisabled,
			isYearUnavailable
		});
		(0, vue.watch)(modelValue, (_modelValue) => {
			if (Array.isArray(_modelValue) && _modelValue.length) {
				const lastValue = _modelValue[_modelValue.length - 1];
				if (lastValue && !require_date_comparators.isSameYear(placeholder.value, lastValue)) onPlaceholderChange(lastValue);
			} else if (!Array.isArray(_modelValue) && _modelValue && !require_date_comparators.isSameYear(placeholder.value, _modelValue)) onPlaceholderChange(_modelValue);
		});
		function onYearChange(value) {
			if (!multiple.value) {
				if (!modelValue.value) {
					modelValue.value = value.copy();
					return;
				}
				if (!preventDeselect.value && require_date_comparators.isSameYear(modelValue.value, value)) {
					placeholder.value = value.copy();
					modelValue.value = void 0;
				} else modelValue.value = value.copy();
			} else if (!modelValue.value) modelValue.value = [value.copy()];
			else if (Array.isArray(modelValue.value)) {
				const index = modelValue.value.findIndex((date) => require_date_comparators.isSameYear(date, value));
				if (index === -1) modelValue.value = [...modelValue.value, value.copy()];
				else if (!preventDeselect.value) {
					const next = modelValue.value.filter((date) => !require_date_comparators.isSameYear(date, value));
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
		provideYearPickerRootContext({
			isYearUnavailable,
			dir,
			isYearDisabled,
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
			isYearSelected,
			isNextButtonDisabled,
			isPrevButtonDisabled,
			nextPage,
			prevPage,
			parentElement,
			onPlaceholderChange,
			onYearChange,
			minValue,
			maxValue,
			yearsPerPage
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
//#region src/YearPicker/YearPickerRoot.vue
var YearPickerRoot_default = YearPickerRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'YearPickerRoot_default', {
  enumerable: true,
  get: function () {
    return YearPickerRoot_default;
  }
});
Object.defineProperty(exports, 'injectYearPickerRootContext', {
  enumerable: true,
  get: function () {
    return injectYearPickerRootContext;
  }
});
//# sourceMappingURL=YearPickerRoot.cjs.map