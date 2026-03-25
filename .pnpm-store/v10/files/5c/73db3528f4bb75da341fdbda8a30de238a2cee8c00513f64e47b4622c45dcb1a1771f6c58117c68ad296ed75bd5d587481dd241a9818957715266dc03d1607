import { useBodyScrollLock } from "../shared/useBodyScrollLock.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectDialogRootContext } from "./DialogRoot.js";
import { createBlock, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Dialog/DialogOverlayImpl.vue?vue&type=script&setup=true&lang.ts
var DialogOverlayImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "DialogOverlayImpl",
	props: {
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
		const rootContext = injectDialogRootContext();
		useBodyScrollLock(true);
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"data-state": unref(rootContext).open.value ? "open" : "closed",
				style: { "pointer-events": "auto" }
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"data-state"
			]);
		};
	}
});

//#endregion
//#region src/Dialog/DialogOverlayImpl.vue
var DialogOverlayImpl_default = DialogOverlayImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { DialogOverlayImpl_default };
//# sourceMappingURL=DialogOverlayImpl.js.map