const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_clamp = require('../shared/clamp.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_nullish = require('../shared/nullish.cjs');
const require_shared_useFormControl = require('../shared/useFormControl.cjs');
const require_shared_useLocale = require('../shared/useLocale.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_VisuallyHidden_VisuallyHiddenInput = require('../VisuallyHidden/VisuallyHiddenInput.cjs');
const require_NumberField_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/NumberField/NumberFieldRoot.vue?vue&type=script&setup=true&lang.ts
const [injectNumberFieldRootContext, provideNumberFieldRootContext] = require_shared_createContext.createContext("NumberFieldRoot");
var NumberFieldRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "NumberFieldRoot",
	props: {
		defaultValue: {
			type: Number,
			required: false,
			default: void 0
		},
		modelValue: {
			type: [Number, null],
			required: false
		},
		min: {
			type: Number,
			required: false
		},
		max: {
			type: Number,
			required: false
		},
		step: {
			type: Number,
			required: false,
			default: 1
		},
		stepSnapping: {
			type: Boolean,
			required: false,
			default: true
		},
		formatOptions: {
			type: null,
			required: false
		},
		locale: {
			type: String,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		readonly: {
			type: Boolean,
			required: false
		},
		disableWheelChange: {
			type: Boolean,
			required: false
		},
		invertWheelChange: {
			type: Boolean,
			required: false
		},
		id: {
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
		},
		name: {
			type: String,
			required: false
		},
		required: {
			type: Boolean,
			required: false
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { disabled, readonly, disableWheelChange, invertWheelChange, min, max, step, stepSnapping, formatOptions, id, locale: propLocale } = (0, vue.toRefs)(props);
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue,
			passive: props.modelValue === void 0
		});
		const { primitiveElement, currentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const locale = require_shared_useLocale.useLocale(propLocale);
		const isFormControl = require_shared_useFormControl.useFormControl(currentElement);
		const inputEl = (0, vue.ref)();
		const isDecreaseDisabled = (0, vue.computed)(() => !require_shared_nullish.isNullish(modelValue.value) && (clampInputValue(modelValue.value) === min.value || min.value && !isNaN(modelValue.value) ? require_NumberField_utils.handleDecimalOperation("-", modelValue.value, step.value) < min.value : false));
		const isIncreaseDisabled = (0, vue.computed)(() => !require_shared_nullish.isNullish(modelValue.value) && (clampInputValue(modelValue.value) === max.value || max.value && !isNaN(modelValue.value) ? require_NumberField_utils.handleDecimalOperation("+", modelValue.value, step.value) > max.value : false));
		function handleChangingValue(type, multiplier = 1) {
			inputEl.value?.focus();
			if (props.disabled || props.readonly) return;
			const currentInputValue = numberParser.parse(inputEl.value?.value ?? "");
			if (isNaN(currentInputValue)) modelValue.value = min.value ?? 0;
			else if (type === "increase") modelValue.value = clampInputValue(currentInputValue + (step.value ?? 1) * multiplier);
			else modelValue.value = clampInputValue(currentInputValue - (step.value ?? 1) * multiplier);
		}
		function handleIncrease(multiplier = 1) {
			handleChangingValue("increase", multiplier);
		}
		function handleDecrease(multiplier = 1) {
			handleChangingValue("decrease", multiplier);
		}
		function handleMinMaxValue(type) {
			if (type === "min" && min.value !== void 0) modelValue.value = clampInputValue(min.value);
			else if (type === "max" && max.value !== void 0) modelValue.value = clampInputValue(max.value);
		}
		const numberFormatter = require_NumberField_utils.useNumberFormatter(locale, formatOptions);
		const numberParser = require_NumberField_utils.useNumberParser(locale, formatOptions);
		const inputMode = (0, vue.computed)(() => {
			const hasDecimals = numberFormatter.resolvedOptions().maximumFractionDigits > 0;
			return hasDecimals ? "decimal" : "numeric";
		});
		const textValueFormatter = require_NumberField_utils.useNumberFormatter(locale, formatOptions);
		const textValue = (0, vue.computed)(() => require_shared_nullish.isNullish(modelValue.value) || isNaN(modelValue.value) ? "" : textValueFormatter.format(modelValue.value));
		function validate(val) {
			return numberParser.isValidPartialNumber(val, min.value, max.value);
		}
		function setInputValue(val) {
			if (inputEl.value) inputEl.value.value = val;
		}
		function clampInputValue(val) {
			let clampedValue;
			if (step.value === void 0 || isNaN(step.value) || !stepSnapping.value) clampedValue = require_shared_clamp.clamp(val, min.value, max.value);
			else clampedValue = require_shared_clamp.snapValueToStep(val, min.value, max.value, step.value);
			clampedValue = numberParser.parse(numberFormatter.format(clampedValue));
			return clampedValue;
		}
		function applyInputValue(val) {
			const parsedValue = numberParser.parse(val);
			modelValue.value = isNaN(parsedValue) ? void 0 : clampInputValue(parsedValue);
			if (!val.length) return setInputValue(val);
			if (isNaN(parsedValue)) return setInputValue(textValue.value);
			return setInputValue(textValue.value);
		}
		provideNumberFieldRootContext({
			modelValue,
			handleDecrease,
			handleIncrease,
			handleMinMaxValue,
			inputMode,
			inputEl,
			onInputElement: (el) => inputEl.value = el,
			textValue,
			validate,
			applyInputValue,
			disabled,
			readonly,
			disableWheelChange,
			invertWheelChange,
			max,
			min,
			isDecreaseDisabled,
			isIncreaseDisabled,
			id
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(_ctx.$attrs, {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				role: "group",
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"data-disabled": (0, vue.unref)(disabled) ? "" : void 0,
				"data-readonly": (0, vue.unref)(readonly) ? "" : void 0
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
					modelValue: (0, vue.unref)(modelValue),
					textValue: textValue.value
				}), (0, vue.unref)(isFormControl) && _ctx.name ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_VisuallyHidden_VisuallyHiddenInput.VisuallyHiddenInput_default), {
					key: 0,
					type: "text",
					value: (0, vue.unref)(modelValue),
					name: _ctx.name,
					disabled: (0, vue.unref)(disabled),
					readonly: (0, vue.unref)(readonly),
					required: _ctx.required
				}, null, 8, [
					"value",
					"name",
					"disabled",
					"readonly",
					"required"
				])) : (0, vue.createCommentVNode)("v-if", true)]),
				_: 3
			}, 16, [
				"as",
				"as-child",
				"data-disabled",
				"data-readonly"
			]);
		};
	}
});

//#endregion
//#region src/NumberField/NumberFieldRoot.vue
var NumberFieldRoot_default = NumberFieldRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'NumberFieldRoot_default', {
  enumerable: true,
  get: function () {
    return NumberFieldRoot_default;
  }
});
Object.defineProperty(exports, 'injectNumberFieldRootContext', {
  enumerable: true,
  get: function () {
    return injectNumberFieldRootContext;
  }
});
//# sourceMappingURL=NumberFieldRoot.cjs.map