const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_color_channel = require('../color/channel.cjs');
const require_ColorArea_ColorAreaRoot = require('./ColorAreaRoot.cjs');
const require_ColorArea_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ColorArea/ColorAreaThumb.vue?vue&type=script&setup=true&lang.ts
var ColorAreaThumb_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ColorAreaThumb",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "span"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = require_ColorArea_ColorAreaRoot.injectColorAreaRootContext();
		const { primitiveElement, currentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		(0, vue.onMounted)(() => {
			rootContext.thumbRef.value = currentElement.value;
		});
		const xPercent = (0, vue.computed)(() => require_ColorArea_utils.convertValueToPercentage(rootContext.xValue.value, rootContext.xRange.value.min, rootContext.xRange.value.max));
		const yPercent = (0, vue.computed)(() => require_ColorArea_utils.convertValueToPercentage(rootContext.yValue.value, rootContext.yRange.value.min, rootContext.yRange.value.max));
		const ariaLabel = (0, vue.computed)(() => {
			return `${require_color_channel.getChannelName(rootContext.xChannel.value)}, ${require_color_channel.getChannelName(rootContext.yChannel.value)}`;
		});
		const ariaValueText = (0, vue.computed)(() => {
			return `${require_color_channel.getChannelName(rootContext.xChannel.value)} ${Math.round(rootContext.xValue.value)}, ${require_color_channel.getChannelName(rootContext.yChannel.value)} ${Math.round(rootContext.yValue.value)}`;
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				role: "slider",
				tabindex: (0, vue.unref)(rootContext).disabled.value ? void 0 : 0,
				"aria-label": ariaLabel.value,
				"aria-roledescription": "Color thumb",
				"aria-valuemin": (0, vue.unref)(rootContext).xRange.value.min,
				"aria-valuemax": (0, vue.unref)(rootContext).xRange.value.max,
				"aria-valuenow": (0, vue.unref)(rootContext).xValue.value,
				"aria-valuetext": ariaValueText.value,
				"aria-orientation": "horizontal",
				"data-disabled": (0, vue.unref)(rootContext).disabled.value ? "" : void 0,
				"as-child": _ctx.asChild,
				as: _ctx.as,
				style: (0, vue.normalizeStyle)({
					position: "absolute",
					left: `${xPercent.value}%`,
					top: `${100 - yPercent.value}%`,
					transform: "translate(-50%, -50%)",
					touchAction: "none"
				})
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"tabindex",
				"aria-label",
				"aria-valuemin",
				"aria-valuemax",
				"aria-valuenow",
				"aria-valuetext",
				"data-disabled",
				"as-child",
				"as",
				"style"
			]);
		};
	}
});

//#endregion
//#region src/ColorArea/ColorAreaThumb.vue
var ColorAreaThumb_default = ColorAreaThumb_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ColorAreaThumb_default', {
  enumerable: true,
  get: function () {
    return ColorAreaThumb_default;
  }
});
//# sourceMappingURL=ColorAreaThumb.cjs.map