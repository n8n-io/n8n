import { useForwardExpose } from "../shared/useForwardExpose.js";
import { DialogClose_default } from "../Dialog/DialogClose.js";
import { injectAlertDialogContentContext } from "./AlertDialogContent.js";
import { createBlock, defineComponent, mergeProps, onMounted, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/AlertDialog/AlertDialogCancel.vue?vue&type=script&setup=true&lang.ts
var AlertDialogCancel_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "AlertDialogCancel",
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
		const contentContext = injectAlertDialogContentContext();
		const { forwardRef, currentElement } = useForwardExpose();
		onMounted(() => {
			contentContext.onCancelElementChange(currentElement.value);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DialogClose_default), mergeProps(props, { ref: unref(forwardRef) }), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/AlertDialog/AlertDialogCancel.vue
var AlertDialogCancel_default = AlertDialogCancel_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { AlertDialogCancel_default };
//# sourceMappingURL=AlertDialogCancel.js.map