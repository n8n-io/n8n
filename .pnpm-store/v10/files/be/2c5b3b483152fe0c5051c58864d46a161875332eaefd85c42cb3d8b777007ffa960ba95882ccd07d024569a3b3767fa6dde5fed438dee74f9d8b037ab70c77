const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_color_gradient = require('../color/gradient.cjs');
const require_Slider_SliderTrack = require('../Slider/SliderTrack.cjs');
const require_ColorSlider_ColorSliderRoot = require('./ColorSliderRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ColorSlider/ColorSliderTrack.vue?vue&type=script&setup=true&lang.ts
var ColorSliderTrack_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ColorSliderTrack",
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
		const backgroundStyle = (0, vue.computed)(() => {
			return require_color_gradient.getSliderBackgroundStyle(rootContext.color.value, rootContext.channel.value, rootContext.colorSpace.value);
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Slider_SliderTrack.SliderTrack_default), {
				as: _ctx.as,
				"as-child": _ctx.asChild,
				style: (0, vue.normalizeStyle)(backgroundStyle.value)
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"style"
			]);
		};
	}
});

//#endregion
//#region src/ColorSlider/ColorSliderTrack.vue
var ColorSliderTrack_default = ColorSliderTrack_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ColorSliderTrack_default', {
  enumerable: true,
  get: function () {
    return ColorSliderTrack_default;
  }
});
//# sourceMappingURL=ColorSliderTrack.cjs.map