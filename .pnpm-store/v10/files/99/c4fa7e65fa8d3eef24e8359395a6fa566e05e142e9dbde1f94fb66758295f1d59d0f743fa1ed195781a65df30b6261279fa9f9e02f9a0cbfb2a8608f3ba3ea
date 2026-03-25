import { useForwardExpose } from "../shared/useForwardExpose.js";
import { ToastAnnounceExclude_default } from "./ToastAnnounceExclude.js";
import { ToastClose_default } from "./ToastClose.js";
import { createBlock, createCommentVNode, createVNode, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Toast/ToastAction.vue?vue&type=script&setup=true&lang.ts
var ToastAction_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ToastAction",
	props: {
		altText: {
			type: String,
			required: true
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
		if (!props.altText) throw new Error("Missing prop `altText` expected on `ToastAction`");
		const { forwardRef } = useForwardExpose();
		return (_ctx, _cache) => {
			return _ctx.altText ? (openBlock(), createBlock(ToastAnnounceExclude_default, {
				key: 0,
				"alt-text": _ctx.altText,
				"as-child": ""
			}, {
				default: withCtx(() => [createVNode(ToastClose_default, {
					ref: unref(forwardRef),
					as: _ctx.as,
					"as-child": _ctx.asChild
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 8, ["as", "as-child"])]),
				_: 3
			}, 8, ["alt-text"])) : createCommentVNode("v-if", true);
		};
	}
});

//#endregion
//#region src/Toast/ToastAction.vue
var ToastAction_default = ToastAction_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ToastAction_default };
//# sourceMappingURL=ToastAction.js.map