const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useFormControl = require('../shared/useFormControl.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_VisuallyHidden_VisuallyHiddenInput = require('../VisuallyHidden/VisuallyHiddenInput.cjs');
const require_color_convert = require('../color/convert.cjs');
const require_color_channel = require('../color/channel.cjs');
const require_color_parse = require('../color/parse.cjs');
const require_Slider_SliderRoot = require('../Slider/SliderRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/ColorSlider/ColorSliderRoot.vue?vue&type=script&setup=true&lang.ts
const [injectColorSliderRootContext, provideColorSliderRootContext] = require_shared_createContext.createContext("ColorSliderRoot");
var ColorSliderRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const { orientation, disabled, inverted, dir: propDir, channel, colorSpace, step: stepProp } = (0, vue.toRefs)(props);
		const dir = require_shared_useDirection.useDirection(propDir);
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const isFormControl = require_shared_useFormControl.useFormControl(currentElement);
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue,
			passive: props.modelValue === void 0
		});
		function toNativeSpace(color$1, ch, space) {
			switch (ch) {
				case "hue":
				case "lightness": return require_color_convert.convertToHsl(color$1);
				case "saturation": return space === "hsb" ? require_color_convert.convertToHsb(color$1) : require_color_convert.convertToHsl(color$1);
				case "brightness": return require_color_convert.convertToHsb(color$1);
				case "red":
				case "green":
				case "blue": return require_color_convert.convertToRgb(color$1);
				case "alpha": return color$1;
				default: return color$1;
			}
		}
		const internalColor = (0, vue.ref)(toNativeSpace(require_color_parse.normalizeColor(modelValue.value ?? props.defaultValue ?? "#000000"), channel.value, colorSpace.value));
		function isAchromatic(color$1) {
			const hsl = require_color_convert.convertToHsl(color$1);
			return hsl.s === 0 || hsl.l === 0 || hsl.l >= 100;
		}
		(0, vue.watch)(() => modelValue.value, (newVal) => {
			if (newVal == null) return;
			const parsed = require_color_parse.normalizeColor(newVal);
			const currentHex = require_color_convert.colorToString(internalColor.value, "hex");
			const newHex = require_color_convert.colorToString(parsed, "hex");
			if (currentHex !== newHex) {
				const nativeColor = toNativeSpace(parsed, channel.value, colorSpace.value);
				const currentChannelVal = require_color_channel.getChannelValue(internalColor.value, channel.value);
				const newChannelVal = require_color_channel.getChannelValue(nativeColor, channel.value);
				const range = channelRange.value.max - channelRange.value.min;
				const shouldPreserve = channel.value === "hue" && isAchromatic(parsed) || Math.abs(currentChannelVal - newChannelVal) < range * .02;
				if (shouldPreserve) internalColor.value = require_color_channel.setChannelValue(nativeColor, channel.value, currentChannelVal);
				else internalColor.value = nativeColor;
			}
		});
		const color = (0, vue.computed)({
			get: () => internalColor.value,
			set: (newColor) => {
				internalColor.value = newColor;
				const hexString = require_color_convert.colorToString(newColor, "hex");
				modelValue.value = hexString;
				emits("update:color", newColor);
			}
		});
		const channelRange = (0, vue.computed)(() => require_color_channel.getChannelRange(channel.value));
		const min = (0, vue.computed)(() => channelRange.value.min);
		const max = (0, vue.computed)(() => channelRange.value.max);
		const step = (0, vue.computed)(() => stepProp.value ?? channelRange.value.step);
		const channelValue = (0, vue.computed)(() => require_color_channel.getChannelValue(color.value, channel.value));
		const sliderValue = (0, vue.computed)({
			get: () => [channelValue.value],
			set: (newValue) => {
				const clamped = Math.max(min.value, Math.min(max.value, newValue[0]));
				const newColor = require_color_channel.setChannelValue(color.value, channel.value, clamped);
				color.value = newColor;
				emits("change", require_color_convert.colorToString(newColor, "hex"));
			}
		});
		function handleValueCommit(values) {
			emits("changeEnd", require_color_convert.colorToString(color.value, "hex"));
		}
		provideColorSliderRootContext({
			color: (0, vue.computed)(() => color.value),
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
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Slider_SliderRoot.SliderRoot_default), (0, vue.mergeProps)(_ctx.$attrs, {
				ref: (0, vue.unref)(forwardRef),
				modelValue: sliderValue.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => sliderValue.value = $event),
				orientation: (0, vue.unref)(orientation),
				dir: (0, vue.unref)(dir),
				disabled: (0, vue.unref)(disabled),
				inverted: (0, vue.unref)(inverted),
				min: min.value,
				max: max.value,
				step: step.value,
				as: _ctx.as,
				"as-child": _ctx.asChild,
				onValueCommit: handleValueCommit
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default"), (0, vue.unref)(isFormControl) && _ctx.name ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_VisuallyHidden_VisuallyHiddenInput.VisuallyHiddenInput_default), {
					key: 0,
					type: "text",
					value: (0, vue.unref)(require_color_convert.colorToString)(color.value, "hex"),
					name: _ctx.name,
					disabled: (0, vue.unref)(disabled),
					required: _ctx.required
				}, null, 8, [
					"value",
					"name",
					"disabled",
					"required"
				])) : (0, vue.createCommentVNode)("v-if", true)]),
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
Object.defineProperty(exports, 'ColorSliderRoot_default', {
  enumerable: true,
  get: function () {
    return ColorSliderRoot_default;
  }
});
Object.defineProperty(exports, 'injectColorSliderRootContext', {
  enumerable: true,
  get: function () {
    return injectColorSliderRootContext;
  }
});
//# sourceMappingURL=ColorSliderRoot.cjs.map