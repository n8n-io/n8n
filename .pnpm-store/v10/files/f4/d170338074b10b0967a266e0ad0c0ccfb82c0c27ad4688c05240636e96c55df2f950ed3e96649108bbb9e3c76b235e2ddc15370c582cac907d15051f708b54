import { clamp, snapValueToStep } from "../shared/clamp.js";
import { createContext } from "../shared/createContext.js";
import { isNullish } from "../shared/nullish.js";
import { useFormControl } from "../shared/useFormControl.js";
import { useLocale } from "../shared/useLocale.js";
import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { VisuallyHiddenInput_default } from "../VisuallyHidden/VisuallyHiddenInput.js";
import { handleDecimalOperation, useNumberFormatter, useNumberParser } from "./utils.js";
import { computed, createBlock, createCommentVNode, defineComponent, mergeProps, openBlock, ref, renderSlot, toRefs, unref, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/NumberField/NumberFieldRoot.vue?vue&type=script&setup=true&lang.ts
const [injectNumberFieldRootContext, provideNumberFieldRootContext] = createContext("NumberFieldRoot");
var NumberFieldRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const { disabled, readonly, disableWheelChange, invertWheelChange, min, max, step, stepSnapping, formatOptions, id, locale: propLocale } = toRefs(props);
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: props.defaultValue,
			passive: props.modelValue === void 0
		});
		const { primitiveElement, currentElement } = usePrimitiveElement();
		const locale = useLocale(propLocale);
		const isFormControl = useFormControl(currentElement);
		const inputEl = ref();
		const isDecreaseDisabled = computed(() => !isNullish(modelValue.value) && (clampInputValue(modelValue.value) === min.value || min.value && !isNaN(modelValue.value) ? handleDecimalOperation("-", modelValue.value, step.value) < min.value : false));
		const isIncreaseDisabled = computed(() => !isNullish(modelValue.value) && (clampInputValue(modelValue.value) === max.value || max.value && !isNaN(modelValue.value) ? handleDecimalOperation("+", modelValue.value, step.value) > max.value : false));
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
		const numberFormatter = useNumberFormatter(locale, formatOptions);
		const numberParser = useNumberParser(locale, formatOptions);
		const inputMode = computed(() => {
			const hasDecimals = numberFormatter.resolvedOptions().maximumFractionDigits > 0;
			return hasDecimals ? "decimal" : "numeric";
		});
		const textValueFormatter = useNumberFormatter(locale, formatOptions);
		const textValue = computed(() => isNullish(modelValue.value) || isNaN(modelValue.value) ? "" : textValueFormatter.format(modelValue.value));
		function validate(val) {
			return numberParser.isValidPartialNumber(val, min.value, max.value);
		}
		function setInputValue(val) {
			if (inputEl.value) inputEl.value.value = val;
		}
		function clampInputValue(val) {
			let clampedValue;
			if (step.value === void 0 || isNaN(step.value) || !stepSnapping.value) clampedValue = clamp(val, min.value, max.value);
			else clampedValue = snapValueToStep(val, min.value, max.value, step.value);
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
			return openBlock(), createBlock(unref(Primitive), mergeProps(_ctx.$attrs, {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				role: "group",
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"data-disabled": unref(disabled) ? "" : void 0,
				"data-readonly": unref(readonly) ? "" : void 0
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {
					modelValue: unref(modelValue),
					textValue: textValue.value
				}), unref(isFormControl) && _ctx.name ? (openBlock(), createBlock(unref(VisuallyHiddenInput_default), {
					key: 0,
					type: "text",
					value: unref(modelValue),
					name: _ctx.name,
					disabled: unref(disabled),
					readonly: unref(readonly),
					required: _ctx.required
				}, null, 8, [
					"value",
					"name",
					"disabled",
					"readonly",
					"required"
				])) : createCommentVNode("v-if", true)]),
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
export { NumberFieldRoot_default, injectNumberFieldRootContext };
//# sourceMappingURL=NumberFieldRoot.js.map