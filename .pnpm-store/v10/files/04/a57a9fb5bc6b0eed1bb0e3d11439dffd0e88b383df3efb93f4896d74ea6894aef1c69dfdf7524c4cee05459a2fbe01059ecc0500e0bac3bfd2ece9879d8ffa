const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_component_Arrow = require('../component/Arrow.cjs');
const require_Popper_PopperContent = require('./PopperContent.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Popper/PopperArrow.vue?vue&type=script&setup=true&lang.ts
const OPPOSITE_SIDE = {
	top: "bottom",
	right: "left",
	bottom: "top",
	left: "right"
};
var PopperArrow_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "PopperArrow",
	props: {
		width: {
			type: Number,
			required: false
		},
		height: {
			type: Number,
			required: false
		},
		rounded: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "svg"
		}
	},
	setup(__props) {
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const contentContext = require_Popper_PopperContent.injectPopperContentContext();
		const baseSide = (0, vue.computed)(() => OPPOSITE_SIDE[contentContext.placedSide.value]);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createElementBlock)("span", {
				ref: (el) => {
					(0, vue.unref)(contentContext).onArrowChange(el);
					return void 0;
				},
				style: (0, vue.normalizeStyle)({
					position: "absolute",
					left: (0, vue.unref)(contentContext).arrowX?.value ? `${(0, vue.unref)(contentContext).arrowX?.value}px` : void 0,
					top: (0, vue.unref)(contentContext).arrowY?.value ? `${(0, vue.unref)(contentContext).arrowY?.value}px` : void 0,
					[baseSide.value]: 0,
					transformOrigin: {
						top: "",
						right: "0 0",
						bottom: "center 0",
						left: "100% 0"
					}[(0, vue.unref)(contentContext).placedSide.value],
					transform: {
						top: "translateY(100%)",
						right: "translateY(50%) rotate(90deg) translateX(-50%)",
						bottom: `rotate(180deg)`,
						left: "translateY(50%) rotate(-90deg) translateX(50%)"
					}[(0, vue.unref)(contentContext).placedSide.value],
					visibility: (0, vue.unref)(contentContext).shouldHideArrow.value ? "hidden" : void 0
				})
			}, [(0, vue.createVNode)(require_component_Arrow.Arrow_default, (0, vue.mergeProps)(_ctx.$attrs, {
				ref: (0, vue.unref)(forwardRef),
				style: { display: "block" },
				as: _ctx.as,
				"as-child": _ctx.asChild,
				rounded: _ctx.rounded,
				width: _ctx.width,
				height: _ctx.height
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"as",
				"as-child",
				"rounded",
				"width",
				"height"
			])], 4);
		};
	}
});

//#endregion
//#region src/Popper/PopperArrow.vue
var PopperArrow_default = PopperArrow_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'PopperArrow_default', {
  enumerable: true,
  get: function () {
    return PopperArrow_default;
  }
});
//# sourceMappingURL=PopperArrow.cjs.map