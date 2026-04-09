import { createContext } from "../shared/createContext.js";
import { useFormControl } from "../shared/useFormControl.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { VisuallyHiddenInput_default } from "../VisuallyHidden/VisuallyHiddenInput.js";
import { colorToString, convertToHsb, convertToHsl } from "../color/convert.js";
import { getChannelRange, getChannelValue, setChannelValues } from "../color/channel.js";
import { getAreaBackgroundStyle } from "../color/gradient.js";
import { normalizeColor } from "../color/parse.js";
import { computed, createBlock, createCommentVNode, defineComponent, nextTick, normalizeStyle, openBlock, ref, renderSlot, toRefs, unref, watch, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/ColorArea/ColorAreaRoot.vue?vue&type=script&setup=true&lang.ts
const [injectColorAreaRootContext, provideColorAreaRootContext] = createContext("ColorAreaRoot");
var ColorAreaRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ColorAreaRoot",
	props: {
		modelValue: {
			type: [String, Object],
			required: false
		},
		defaultValue: {
			type: [String, Object],
			required: false,
			default: "#ff0000"
		},
		colorSpace: {
			type: String,
			required: false,
			default: "hsl"
		},
		xChannel: {
			type: String,
			required: false,
			default: "hue"
		},
		yChannel: {
			type: String,
			required: false,
			default: "saturation"
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		xName: {
			type: String,
			required: false
		},
		yName: {
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
	emits: [
		"update:modelValue",
		"update:color",
		"change",
		"changeEnd"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { colorSpace, xChannel, yChannel, disabled } = toRefs(props);
		const { forwardRef, currentElement } = useForwardExpose();
		const isFormControl = useFormControl(currentElement);
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
		const xRange = computed(() => getChannelRange(xChannel.value));
		const yRange = computed(() => getChannelRange(yChannel.value));
		const xValue = ref(Math.round(getChannelValue(color.value, xChannel.value)));
		const yValue = ref(Math.round(getChannelValue(color.value, yChannel.value)));
		const hueValue = ref(colorSpace.value === "hsl" ? convertToHsl(color.value).h : colorSpace.value === "hsb" ? convertToHsb(color.value).h : 0);
		let isUpdating = false;
		watch(() => color.value, (newColor) => {
			if (isUpdating) return;
			const newX = Math.round(getChannelValue(newColor, xChannel.value));
			const newY = Math.round(getChannelValue(newColor, yChannel.value));
			if (Math.round(xValue.value) !== newX) xValue.value = newX;
			if (Math.round(yValue.value) !== newY) yValue.value = newY;
			if (colorSpace.value === "hsl") {
				const hsl = convertToHsl(newColor);
				if (hsl.s > 0) hueValue.value = hsl.h;
			} else if (colorSpace.value === "hsb") {
				const hsb = convertToHsb(newColor);
				if (hsb.s > 0) hueValue.value = hsb.h;
			}
		}, { immediate: true });
		const areaStyles = computed(() => {
			let bgColor = color.value;
			if (colorSpace.value === "hsl" || colorSpace.value === "hsb") if (colorSpace.value === "hsl") bgColor = {
				space: "hsl",
				h: hueValue.value,
				s: 100,
				l: 50,
				alpha: 1
			};
			else bgColor = {
				space: "hsb",
				h: hueValue.value,
				s: 100,
				b: 100,
				alpha: 1
			};
			return getAreaBackgroundStyle(bgColor, xChannel.value, yChannel.value, colorSpace.value);
		});
		function updateValues(x, y) {
			const clampedX = Math.max(xRange.value.min, Math.min(xRange.value.max, x));
			const clampedY = Math.max(yRange.value.min, Math.min(yRange.value.max, y));
			xValue.value = clampedX;
			yValue.value = clampedY;
			isUpdating = true;
			const channels = [{
				channel: xChannel.value,
				value: clampedX
			}, {
				channel: yChannel.value,
				value: clampedY
			}];
			const usesHueAxis = xChannel.value === "hue" || yChannel.value === "hue";
			if (!usesHueAxis && (colorSpace.value === "hsl" || colorSpace.value === "hsb")) channels.push({
				channel: "hue",
				value: hueValue.value
			});
			color.value = setChannelValues(color.value, channels);
			nextTick(() => {
				isUpdating = false;
			});
		}
		function commitValues() {
			emits("changeEnd", colorToString(color.value, "hex"));
		}
		const thumbRef = ref();
		provideColorAreaRootContext({
			color: computed(() => color.value),
			xValue,
			yValue,
			xChannel,
			yChannel,
			colorSpace,
			disabled,
			xRange,
			yRange,
			thumbRef,
			updateValues,
			commitValues
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref: unref(forwardRef),
				as: _ctx.as,
				"as-child": _ctx.asChild,
				role: "group",
				"aria-disabled": unref(disabled) ? "true" : void 0,
				"data-disabled": unref(disabled) ? "" : void 0
			}, {
				default: withCtx(() => [
					renderSlot(_ctx.$slots, "default", { style: normalizeStyle(areaStyles.value) }),
					unref(isFormControl) && _ctx.xName ? (openBlock(), createBlock(unref(VisuallyHiddenInput_default), {
						key: 0,
						type: "text",
						value: xValue.value,
						name: _ctx.xName,
						disabled: unref(disabled)
					}, null, 8, [
						"value",
						"name",
						"disabled"
					])) : createCommentVNode("v-if", true),
					unref(isFormControl) && _ctx.yName ? (openBlock(), createBlock(unref(VisuallyHiddenInput_default), {
						key: 1,
						type: "text",
						value: yValue.value,
						name: _ctx.yName,
						disabled: unref(disabled)
					}, null, 8, [
						"value",
						"name",
						"disabled"
					])) : createCommentVNode("v-if", true)
				]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"aria-disabled",
				"data-disabled"
			]);
		};
	}
});

//#endregion
//#region src/ColorArea/ColorAreaRoot.vue
var ColorAreaRoot_default = ColorAreaRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ColorAreaRoot_default, injectColorAreaRootContext };
//# sourceMappingURL=ColorAreaRoot.js.map