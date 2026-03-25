import { useForwardExpose } from "../shared/useForwardExpose.js";
import { DialogOverlay_default } from "../Dialog/DialogOverlay.js";
import { createBlock, defineComponent, guardReactiveProps, normalizeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/AlertDialog/AlertDialogOverlay.vue?vue&type=script&setup=true&lang.ts
var AlertDialogOverlay_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "AlertDialogOverlay",
	props: {
		forceMount: {
			type: Boolean,
			required: false
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
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DialogOverlay_default), normalizeProps(guardReactiveProps(props)), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/AlertDialog/AlertDialogOverlay.vue
var AlertDialogOverlay_default = AlertDialogOverlay_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { AlertDialogOverlay_default };
//# sourceMappingURL=AlertDialogOverlay.js.map