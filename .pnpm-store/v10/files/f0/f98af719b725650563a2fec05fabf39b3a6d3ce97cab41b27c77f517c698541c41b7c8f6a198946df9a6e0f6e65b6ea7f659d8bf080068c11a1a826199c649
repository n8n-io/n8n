import { createContext } from "../shared/createContext.js";
import { useFormControl } from "../shared/useFormControl.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useLocale } from "../shared/useLocale.js";
import { Primitive } from "../Primitive/Primitive.js";
import { VisuallyHiddenInput_default } from "../VisuallyHidden/VisuallyHiddenInput.js";
import { colorToString, convertToRgb } from "../color/convert.js";
import { getChannelRange, getChannelValue, setChannelValue } from "../color/channel.js";
import { isValidColor, normalizeColor, parseColor } from "../color/parse.js";
import { computed, createBlock, createCommentVNode, defineComponent, openBlock, ref, renderSlot, toRefs, unref, watch, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/ColorField/ColorFieldRoot.vue?vue&type=script&setup=true&lang.ts
const [injectColorFieldRootContext, provideColorFieldRootContext] = createContext("ColorFieldRoot");
var ColorFieldRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ColorFieldRoot",
	props: {
		modelValue: {
			type: [String, Object],
			required: false
		},
		defaultValue: {
			type: [String, Object],
			required: false,
			default: "#000000"
		},
		colorSpace: {
			type: String,
			required: false,
			default: "hsl"
		},
		channel: {
			type: String,
			required: false
		},
		placeholder: {
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
		disableWheelChange: {
			type: Boolean,
			required: false,
			default: false
		},
		locale: {
			type: String,
			required: false
		},
		step: {
			type: Number,
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
	emits: ["update:modelValue", "update:color"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { colorSpace, channel, disabled, readonly, disableWheelChange, placeholder, locale: propLocale, step: stepProp } = toRefs(props);
		const { forwardRef, currentElement } = useForwardExpose();
		const isFormControl = useFormControl(currentElement);
		const locale = useLocale(propLocale);
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: props.defaultValue,
			passive: props.modelValue === void 0
		});
		const color = computed({
			get: () => normalizeColor(modelValue.value ?? "#000000"),
			set: (newColor) => {
				const hexString = colorToString(newColor, "hex");
				modelValue.value = hexString;
				emits("update:color", newColor);
			}
		});
		const inputValue = ref("");
		const isEditing = ref(false);
		watch(() => color.value, (newColor) => {
			if (!isEditing.value) inputValue.value = formatValue(newColor);
		}, { immediate: true });
		function formatValue(c) {
			if (channel.value) {
				const value = getChannelValue(c, channel.value);
				if (channel.value === "alpha") return String(Math.round(value));
				return String(Math.round(value));
			}
			return colorToString(c, "hex");
		}
		const MIN_HEX_INT = 0;
		const MAX_HEX_INT = 16777215;
		const PAGE_STEP_MULTIPLIER = 10;
		function getStep() {
			if (stepProp.value != null) return stepProp.value;
			if (channel.value) return getChannelRange(channel.value).step;
			return 1;
		}
		function updateValue(value) {
			inputValue.value = value;
		}
		function commit() {
			isEditing.value = false;
			if (channel.value) {
				const numValue = parseFloat(inputValue.value);
				if (!isNaN(numValue)) {
					const range = getChannelRange(channel.value);
					const clamped = Math.max(range.min, Math.min(range.max, numValue));
					color.value = setChannelValue(color.value, channel.value, clamped);
				}
				inputValue.value = formatValue(color.value);
			} else {
				const trimmed = inputValue.value.trim();
				if (isValidColor(trimmed)) color.value = parseColor(trimmed);
				inputValue.value = formatValue(color.value);
			}
		}
		function addHexValue(delta) {
			const intDelta = Math.trunc(delta);
			const hexInt = color.value.space === "rgb" ? Math.round(color.value.r) << 16 | Math.round(color.value.g) << 8 | Math.round(color.value.b) : (() => {
				const rgb = convertToRgb(color.value);
				return Math.round(rgb.r) << 16 | Math.round(rgb.g) << 8 | Math.round(rgb.b);
			})();
			const clamped = Math.min(Math.max(hexInt + intDelta, MIN_HEX_INT), MAX_HEX_INT);
			const hex = `#${clamped.toString(16).padStart(6, "0")}`;
			color.value = parseColor(hex);
			inputValue.value = formatValue(color.value);
		}
		function increment() {
			if (disabled.value || readonly.value) return;
			const step = getStep();
			if (channel.value) {
				const currentValue = getChannelValue(color.value, channel.value);
				color.value = setChannelValue(color.value, channel.value, currentValue + step);
				inputValue.value = formatValue(color.value);
			} else addHexValue(step);
		}
		function decrement() {
			if (disabled.value || readonly.value) return;
			const step = getStep();
			if (channel.value) {
				const currentValue = getChannelValue(color.value, channel.value);
				color.value = setChannelValue(color.value, channel.value, currentValue - step);
				inputValue.value = formatValue(color.value);
			} else addHexValue(-step);
		}
		function incrementPage() {
			if (disabled.value || readonly.value) return;
			const step = getStep() * PAGE_STEP_MULTIPLIER;
			if (channel.value) {
				const currentValue = getChannelValue(color.value, channel.value);
				color.value = setChannelValue(color.value, channel.value, currentValue + step);
				inputValue.value = formatValue(color.value);
			} else addHexValue(step);
		}
		function decrementPage() {
			if (disabled.value || readonly.value) return;
			const step = getStep() * PAGE_STEP_MULTIPLIER;
			if (channel.value) {
				const currentValue = getChannelValue(color.value, channel.value);
				color.value = setChannelValue(color.value, channel.value, currentValue - step);
				inputValue.value = formatValue(color.value);
			} else addHexValue(-step);
		}
		function incrementToMax() {
			if (disabled.value || readonly.value) return;
			if (channel.value) {
				const range = getChannelRange(channel.value);
				color.value = setChannelValue(color.value, channel.value, range.max);
				inputValue.value = formatValue(color.value);
			} else addHexValue(MAX_HEX_INT);
		}
		function decrementToMin() {
			if (disabled.value || readonly.value) return;
			if (channel.value) {
				const range = getChannelRange(channel.value);
				color.value = setChannelValue(color.value, channel.value, range.min);
				inputValue.value = formatValue(color.value);
			} else addHexValue(-MAX_HEX_INT);
		}
		function handleWheel(event) {
			if (disableWheelChange.value || disabled.value || readonly.value) return;
			event.preventDefault();
			if (event.deltaY > 0) decrement();
			else increment();
		}
		provideColorFieldRootContext({
			color: computed(() => color.value),
			inputValue,
			channel,
			colorSpace,
			disabled,
			readonly,
			disableWheelChange,
			placeholder,
			updateValue,
			commit,
			increment,
			decrement,
			incrementToMax,
			decrementToMin,
			incrementPage,
			decrementPage,
			handleWheel
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref: unref(forwardRef),
				as: _ctx.as,
				"as-child": _ctx.asChild,
				role: "group",
				"data-disabled": unref(disabled) ? "" : void 0,
				"data-readonly": unref(readonly) ? "" : void 0
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default"), unref(isFormControl) && _ctx.name ? (openBlock(), createBlock(unref(VisuallyHiddenInput_default), {
					key: 0,
					type: "text",
					value: unref(colorToString)(color.value, "hex"),
					name: _ctx.name,
					disabled: unref(disabled),
					required: _ctx.required
				}, null, 8, [
					"value",
					"name",
					"disabled",
					"required"
				])) : createCommentVNode("v-if", true)]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"data-disabled",
				"data-readonly"
			]);
		};
	}
});

//#endregion
//#region src/ColorField/ColorFieldRoot.vue
var ColorFieldRoot_default = ColorFieldRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ColorFieldRoot_default, injectColorFieldRootContext };
//# sourceMappingURL=ColorFieldRoot.js.map