import { createContext } from "../shared/createContext.js";
import { useDirection } from "../shared/useDirection.js";
import { useFormControl } from "../shared/useFormControl.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { VisuallyHiddenInput_default } from "../VisuallyHidden/VisuallyHiddenInput.js";
import { colorToString, convertToHsb, convertToHsl, convertToRgb } from "../color/convert.js";
import { getChannelRange, getChannelValue, setChannelValue } from "../color/channel.js";
import { normalizeColor } from "../color/parse.js";
import { SliderRoot_default } from "../Slider/SliderRoot.js";
import { computed, createBlock, createCommentVNode, defineComponent, mergeProps, openBlock, ref, renderSlot, toRefs, unref, watch, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/ColorSlider/ColorSliderRoot.vue?vue&type=script&setup=true&lang.ts
const [injectColorSliderRootContext, provideColorSliderRootContext] = createContext("ColorSliderRoot");
var ColorSliderRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ColorSliderRoot",
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
			required: true
		},
		orientation: {
			type: String,
			required: false,
			default: "horizontal"
		},
		dir: {
			type: String,
			required: false
		},
		inverted: {
			type: Boolean,
			required: false,
			default: false
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
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
			default: "span"
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
	emits: [
		"update:modelValue",
		"update:color",
		"change",
		"changeEnd"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { orientation, disabled, inverted, dir: propDir, channel, colorSpace, step: stepProp } = toRefs(props);
		const dir = useDirection(propDir);
		const { forwardRef, currentElement } = useForwardExpose();
		const isFormControl = useFormControl(currentElement);
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: props.defaultValue,
			passive: props.modelValue === void 0
		});
		function toNativeSpace(color$1, ch, space) {
			switch (ch) {
				case "hue":
				case "lightness": return convertToHsl(color$1);
				case "saturation": return space === "hsb" ? convertToHsb(color$1) : convertToHsl(color$1);
				case "brightness": return convertToHsb(color$1);
				case "red":
				case "green":
				case "blue": return convertToRgb(color$1);
				case "alpha": return color$1;
				default: return color$1;
			}
		}
		const internalColor = ref(toNativeSpace(normalizeColor(modelValue.value ?? props.defaultValue ?? "#000000"), channel.value, colorSpace.value));
		function isAchromatic(color$1) {
			const hsl = convertToHsl(color$1);
			return hsl.s === 0 || hsl.l === 0 || hsl.l >= 100;
		}
		watch(() => modelValue.value, (newVal) => {
			if (newVal == null) return;
			const parsed = normalizeColor(newVal);
			const currentHex = colorToString(internalColor.value, "hex");
			const newHex = colorToString(parsed, "hex");
			if (currentHex !== newHex) {
				const nativeColor = toNativeSpace(parsed, channel.value, colorSpace.value);
				const currentChannelVal = getChannelValue(internalColor.value, channel.value);
				const newChannelVal = getChannelValue(nativeColor, channel.value);
				const range = channelRange.value.max - channelRange.value.min;
				const shouldPreserve = channel.value === "hue" && isAchromatic(parsed) || Math.abs(currentChannelVal - newChannelVal) < range * .02;
				if (shouldPreserve) internalColor.value = setChannelValue(nativeColor, channel.value, currentChannelVal);
				else internalColor.value = nativeColor;
			}
		});
		const color = computed({
			get: () => internalColor.value,
			set: (newColor) => {
				internalColor.value = newColor;
				const hexString = colorToString(newColor, "hex");
				modelValue.value = hexString;
				emits("update:color", newColor);
			}
		});
		const channelRange = computed(() => getChannelRange(channel.value));
		const min = computed(() => channelRange.value.min);
		const max = computed(() => channelRange.value.max);
		const step = computed(() => stepProp.value ?? channelRange.value.step);
		const channelValue = computed(() => getChannelValue(color.value, channel.value));
		const sliderValue = computed({
			get: () => [channelValue.value],
			set: (newValue) => {
				const clamped = Math.max(min.value, Math.min(max.value, newValue[0]));
				const newColor = setChannelValue(color.value, channel.value, clamped);
				color.value = newColor;
				emits("change", colorToString(newColor, "hex"));
			}
		});
		function handleValueCommit(values) {
			emits("changeEnd", colorToString(color.value, "hex"));
		}
		provideColorSliderRootContext({
			color: computed(() => color.value),
			channelValue,
			channel,
			colorSpace,
			orientation,
			disabled,
			inverted,
			min,
			max,
			step
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SliderRoot_default), mergeProps(_ctx.$attrs, {
				ref: unref(forwardRef),
				modelValue: sliderValue.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => sliderValue.value = $event),
				orientation: unref(orientation),
				dir: unref(dir),
				disabled: unref(disabled),
				inverted: unref(inverted),
				min: min.value,
				max: max.value,
				step: step.value,
				as: _ctx.as,
				"as-child": _ctx.asChild,
				onValueCommit: handleValueCommit
			}), {
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
			}, 16, [
				"modelValue",
				"orientation",
				"dir",
				"disabled",
				"inverted",
				"min",
				"max",
				"step",
				"as",
				"as-child"
			]);
		};
	}
});

//#endregion
//#region src/ColorSlider/ColorSliderRoot.vue
var ColorSliderRoot_default = ColorSliderRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ColorSliderRoot_default, injectColorSliderRootContext };
//# sourceMappingURL=ColorSliderRoot.js.map