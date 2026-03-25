const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/VisuallyHidden/VisuallyHidden.vue?vue&type=script&setup=true&lang.ts
var VisuallyHidden_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "VisuallyHidden",
	props: {
		feature: {
			type: String,
			required: false,
			default: "focusable"
		},
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
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"aria-hidden": _ctx.feature === "focusable" ? "true" : void 0,
				"data-hidden": _ctx.feature === "fully-hidden" ? "" : void 0,
				tabindex: _ctx.feature === "fully-hidden" ? "-1" : void 0,
				style: {
					position: "absolute",
					border: 0,
					width: "1px",
					height: "1px",
					padding: 0,
					margin: "-1px",
					overflow: "hidden",
					clip: "rect(0, 0, 0, 0)",
					clipPath: "inset(50%)",
					whiteSpace: "nowrap",
					wordWrap: "normal"
				}
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"aria-hidden",
				"data-hidden",
				"tabindex"
			]);
		};
	}
});

//#endregion
//#region src/VisuallyHidden/VisuallyHidden.vue
var VisuallyHidden_default = VisuallyHidden_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'VisuallyHidden_default', {
  enumerable: true,
  get: function () {
    return VisuallyHidden_default;
  }
});
//# sourceMappingURL=VisuallyHidden.cjs.map