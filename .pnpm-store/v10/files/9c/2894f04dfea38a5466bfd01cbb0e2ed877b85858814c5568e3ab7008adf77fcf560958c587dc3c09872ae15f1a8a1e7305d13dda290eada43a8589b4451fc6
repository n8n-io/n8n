const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/AspectRatio/AspectRatio.vue?vue&type=script&setup=true&lang.ts
var AspectRatio_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "AspectRatio",
	props: {
		ratio: {
			type: Number,
			required: false,
			default: 1
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const aspect = (0, vue.computed)(() => {
			return 1 / props.ratio * 100;
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createElementBlock)("div", {
				style: (0, vue.normalizeStyle)(`position: relative; width: 100%; padding-bottom: ${aspect.value}%`),
				"data-reka-aspect-ratio-wrapper": ""
			}, [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
				ref: (0, vue.unref)(forwardRef),
				"as-child": _ctx.asChild,
				as: _ctx.as,
				style: {
					"position": "absolute",
					"inset": "0px"
				}
			}, _ctx.$attrs), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { aspect: aspect.value })]),
				_: 3
			}, 16, ["as-child", "as"])], 4);
		};
	}
});

//#endregion
//#region src/AspectRatio/AspectRatio.vue
var AspectRatio_default = AspectRatio_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'AspectRatio_default', {
  enumerable: true,
  get: function () {
    return AspectRatio_default;
  }
});
//# sourceMappingURL=AspectRatio.cjs.map