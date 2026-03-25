import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useForwardPropsEmits } from "../shared/useForwardPropsEmits.js";
import { DialogRoot_default } from "../Dialog/DialogRoot.js";
import { createBlock, defineComponent, guardReactiveProps, mergeProps, normalizeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/AlertDialog/AlertDialogRoot.vue?vue&type=script&setup=true&lang.ts
var AlertDialogRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "AlertDialogRoot",
	props: {
		open: {
			type: Boolean,
			required: false
		},
		defaultOpen: {
			type: Boolean,
			required: false
		}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardPropsEmits(props, emits);
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DialogRoot_default), mergeProps(unref(forwarded), { modal: true }), {
				default: withCtx((slotProps) => [renderSlot(_ctx.$slots, "default", normalizeProps(guardReactiveProps(slotProps)))]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/AlertDialog/AlertDialogRoot.vue
var AlertDialogRoot_default = AlertDialogRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { AlertDialogRoot_default };
//# sourceMappingURL=AlertDialogRoot.js.map