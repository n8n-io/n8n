const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Slider_utils = require('./utils.cjs');
const require_Slider_SliderRoot = require('./SliderRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Slider/SliderRange.vue?vue&type=script&setup=true&lang.ts
var SliderRange_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "SliderRange",
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
		const rootContext = require_Slider_SliderRoot.injectSliderRootContext();
		const orientation = require_Slider_utils.injectSliderOrientationContext();
		require_shared_useForwardExpose.useForwardExpose();
		const percentages = (0, vue.computed)(() => rootContext.currentModelValue.value.map((value) => require_Slider_utils.convertValueToPercentage(value, rootContext.min.value, rootContext.max.value)));
		const offsetStart = (0, vue.computed)(() => rootContext.currentModelValue.value.length > 1 ? Math.min(...percentages.value) : 0);
		const offsetEnd = (0, vue.computed)(() => 100 - Math.max(...percentages.value, 0));
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				"data-disabled": (0, vue.unref)(rootContext).disabled.value ? "" : void 0,
				"data-orientation": (0, vue.unref)(rootContext).orientation.value,
				"as-child": _ctx.asChild,
				as: _ctx.as,
				style: (0, vue.normalizeStyle)({
					[(0, vue.unref)(orientation).startEdge.value]: `${offsetStart.value}%`,
					[(0, vue.unref)(orientation).endEdge.value]: `${offsetEnd.value}%`
				})
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"data-disabled",
				"data-orientation",
				"as-child",
				"as",
				"style"
			]);
		};
	}
});

//#endregion
//#region src/Slider/SliderRange.vue
var SliderRange_default = SliderRange_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SliderRange_default', {
  enumerable: true,
  get: function () {
    return SliderRange_default;
  }
});
//# sourceMappingURL=SliderRange.cjs.map