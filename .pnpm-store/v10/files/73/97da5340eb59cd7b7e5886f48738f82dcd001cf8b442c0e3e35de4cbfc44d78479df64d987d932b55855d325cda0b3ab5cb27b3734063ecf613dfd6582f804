import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { createBlock, createCommentVNode, createElementBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/shared/component/Arrow.vue?vue&type=script&setup=true&lang.ts
const _hoisted_1 = {
	key: 0,
	d: "M0 0L6 6L12 0"
};
const _hoisted_2 = {
	key: 1,
	d: "M0 0L4.58579 4.58579C5.36683 5.36683 6.63316 5.36684 7.41421 4.58579L12 0"
};
var Arrow_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "Arrow",
	props: {
		width: {
			type: Number,
			required: false,
			default: 10
		},
		height: {
			type: Number,
			required: false,
			default: 5
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
		const props = __props;
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, {
				width: _ctx.width,
				height: _ctx.height,
				viewBox: _ctx.asChild ? void 0 : "0 0 12 6",
				preserveAspectRatio: _ctx.asChild ? void 0 : "none"
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {}, () => [!_ctx.rounded ? (openBlock(), createElementBlock("path", _hoisted_1)) : (openBlock(), createElementBlock("path", _hoisted_2))])]),
				_: 3
			}, 16, [
				"width",
				"height",
				"viewBox",
				"preserveAspectRatio"
			]);
		};
	}
});

//#endregion
//#region src/shared/component/Arrow.vue
var Arrow_default = Arrow_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { Arrow_default };
//# sourceMappingURL=Arrow.js.map