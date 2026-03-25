import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { ToastAnnounceExclude_default } from "./ToastAnnounceExclude.js";
import { injectToastRootContext } from "./ToastRootImpl.js";
import { createBlock, createVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Toast/ToastClose.vue?vue&type=script&setup=true&lang.ts
var ToastClose_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ToastClose",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "button"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectToastRootContext();
		const { forwardRef } = useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(ToastAnnounceExclude_default, { "as-child": "" }, {
				default: withCtx(() => [createVNode(unref(Primitive), mergeProps(props, {
					ref: unref(forwardRef),
					type: _ctx.as === "button" ? "button" : void 0,
					onClick: unref(rootContext).onClose
				}), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16, ["type", "onClick"])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Toast/ToastClose.vue
var ToastClose_default = ToastClose_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ToastClose_default };
//# sourceMappingURL=ToastClose.js.map