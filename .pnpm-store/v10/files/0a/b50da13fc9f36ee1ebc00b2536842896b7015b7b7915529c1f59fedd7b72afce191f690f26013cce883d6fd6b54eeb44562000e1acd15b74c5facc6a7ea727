const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useFormControl = require('../shared/useFormControl.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_VisuallyHidden_VisuallyHiddenInput = require('../VisuallyHidden/VisuallyHiddenInput.cjs');
const require_color_convert = require('../color/convert.cjs');
const require_color_channel = require('../color/channel.cjs');
const require_color_gradient = require('../color/gradient.cjs');
const require_color_parse = require('../color/parse.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/ColorArea/ColorAreaRoot.vue?vue&type=script&setup=true&lang.ts
const [injectColorAreaRootContext, provideColorAreaRootContext] = require_shared_createContext.createContext("ColorAreaRoot");
var ColorAreaRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const { colorSpace, xChannel, yChannel, disabled } = (0, vue.toRefs)(props);
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const isFormControl = require_shared_useFormControl.useFormControl(currentElement);
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue,
			passive: props.modelValue === void 0
		});
		const color = (0, vue.computed)({
			get: () => require_color_parse.normalizeColor(modelValue.value ?? "#000000"),
			set: (newColor) => {
				const hexString = require_color_convert.colorToString(newColor, "hex");
				modelValue.value = hexString;
				emits("update:color", newColor);
			}
		});
		const xRange = (0, vue.computed)(() => require_color_channel.getChannelRange(xChannel.value));
		const yRange = (0, vue.computed)(() => require_color_channel.getChannelRange(yChannel.value));
		const xValue = (0, vue.ref)(Math.round(require_color_channel.getChannelValue(color.value, xChannel.value)));
		const yValue = (0, vue.ref)(Math.round(require_color_channel.getChannelValue(color.value, yChannel.value)));
		const hueValue = (0, vue.ref)(colorSpace.value === "hsl" ? require_color_convert.convertToHsl(color.value).h : colorSpace.value === "hsb" ? require_color_convert.convertToHsb(color.value).h : 0);
		let isUpdating = false;
		(0, vue.watch)(() => color.value, (newColor) => {
			if (isUpdating) return;
			const newX = Math.round(require_color_channel.getChannelValue(newColor, xChannel.value));
			const newY = Math.round(require_color_channel.getChannelValue(newColor, yChannel.value));
			if (Math.round(xValue.value) !== newX) xValue.value = newX;
			if (Math.round(yValue.value) !== newY) yValue.value = newY;
			if (colorSpace.value === "hsl") {
				const hsl = require_color_convert.convertToHsl(newColor);
				if (hsl.s > 0) hueValue.value = hsl.h;
			} else if (colorSpace.value === "hsb") {
				const hsb = require_color_convert.convertToHsb(newColor);
				if (hsb.s > 0) hueValue.value = hsb.h;
			}
		}, { immediate: true });
		const areaStyles = (0, vue.computed)(() => {
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
			return require_color_gradient.getAreaBackgroundStyle(bgColor, xChannel.value, yChannel.value, colorSpace.value);
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
			color.value = require_color_channel.setChannelValues(color.value, channels);
			(0, vue.nextTick)(() => {
				isUpdating = false;
			});
		}
		function commitValues() {
			emits("changeEnd", require_color_convert.colorToString(color.value, "hex"));
		}
		const thumbRef = (0, vue.ref)();
		provideColorAreaRootContext({
			color: (0, vue.computed)(() => color.value),
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
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref: (0, vue.unref)(forwardRef),
				as: _ctx.as,
				"as-child": _ctx.asChild,
				role: "group",
				"aria-disabled": (0, vue.unref)(disabled) ? "true" : void 0,
				"data-disabled": (0, vue.unref)(disabled) ? "" : void 0
			}, {
				default: (0, vue.withCtx)(() => [
					(0, vue.renderSlot)(_ctx.$slots, "default", { style: (0, vue.normalizeStyle)(areaStyles.value) }),
					(0, vue.unref)(isFormControl) && _ctx.xName ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_VisuallyHidden_VisuallyHiddenInput.VisuallyHiddenInput_default), {
						key: 0,
						type: "text",
						value: xValue.value,
						name: _ctx.xName,
						disabled: (0, vue.unref)(disabled)
					}, null, 8, [
						"value",
						"name",
						"disabled"
					])) : (0, vue.createCommentVNode)("v-if", true),
					(0, vue.unref)(isFormControl) && _ctx.yName ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_VisuallyHidden_VisuallyHiddenInput.VisuallyHiddenInput_default), {
						key: 1,
						type: "text",
						value: yValue.value,
						name: _ctx.yName,
						disabled: (0, vue.unref)(disabled)
					}, null, 8, [
						"value",
						"name",
						"disabled"
					])) : (0, vue.createCommentVNode)("v-if", true)
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
Object.defineProperty(exports, 'ColorAreaRoot_default', {
  enumerable: true,
  get: function () {
    return ColorAreaRoot_default;
  }
});
Object.defineProperty(exports, 'injectColorAreaRootContext', {
  enumerable: true,
  get: function () {
    return injectColorAreaRootContext;
  }
});
//# sourceMappingURL=ColorAreaRoot.cjs.map