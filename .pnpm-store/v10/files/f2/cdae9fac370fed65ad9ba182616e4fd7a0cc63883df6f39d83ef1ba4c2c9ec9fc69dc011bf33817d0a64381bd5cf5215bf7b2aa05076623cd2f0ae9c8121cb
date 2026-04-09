const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_color_channel = require('../color/channel.cjs');
const require_Slider_SliderThumb = require('../Slider/SliderThumb.cjs');
const require_ColorSlider_ColorSliderRoot = require('./ColorSliderRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ColorSlider/ColorSliderThumb.vue?vue&type=script&setup=true&lang.ts
var ColorSliderThumb_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ColorSliderThumb",
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
		const rootContext = require_ColorSlider_ColorSliderRoot.injectColorSliderRootContext();
		const ariaLabel = (0, vue.computed)(() => {
			return require_color_channel.getChannelName(rootContext.channel.value);
		});
		const ariaValueText = (0, vue.computed)(() => {
			const value = rootContext.channelValue.value;
			const channel = rootContext.channel.value;
			if (channel === "alpha") return `${Math.round(value)}%`;
			return String(Math.round(value));
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Slider_SliderThumb.SliderThumb_default), {
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"aria-label": ariaLabel.value,
				"aria-valuetext": ariaValueText.value
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
					channelName: ariaLabel.value,
					channelValue: (0, vue.unref)(rootContext).channelValue.value
				})]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"aria-label",
				"aria-valuetext"
			]);
		};
	}
});

//#endregion
//#region src/ColorSlider/ColorSliderThumb.vue
var ColorSliderThumb_default = ColorSliderThumb_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ColorSliderThumb_default', {
  enumerable: true,
  get: function () {
    return ColorSliderThumb_default;
  }
});
//# sourceMappingURL=ColorSliderThumb.cjs.map