import { createContext } from "../shared/createContext.js";
import { useEmitAsProps } from "../shared/useEmitAsProps.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { DialogContent_default } from "../Dialog/DialogContent.js";
import { createBlock, defineComponent, mergeProps, nextTick, openBlock, ref, renderSlot, unref, withCtx, withModifiers } from "vue";

//#region src/AlertDialog/AlertDialogContent.vue?vue&type=script&setup=true&lang.ts
const [injectAlertDialogContentContext, provideAlertDialogContentContext] = createContext("AlertDialogContent");
var AlertDialogContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "AlertDialogContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		disableOutsidePointerEvents: {
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
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const emitsAsProps = useEmitAsProps(emits);
		useForwardExpose();
		const cancelElement = ref();
		provideAlertDialogContentContext({ onCancelElementChange: (el) => {
			cancelElement.value = el;
		} });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DialogContent_default), mergeProps({
				...props,
				...unref(emitsAsProps)
			}, {
				role: "alertdialog",
				onPointerDownOutside: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
				onInteractOutside: _cache[1] || (_cache[1] = withModifiers(() => {}, ["prevent"])),
				onOpenAutoFocus: _cache[2] || (_cache[2] = () => {
					nextTick(() => {
						cancelElement.value?.focus({ preventScroll: true });
					});
				})
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/AlertDialog/AlertDialogContent.vue
var AlertDialogContent_default = AlertDialogContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { AlertDialogContent_default, injectAlertDialogContentContext };
//# sourceMappingURL=AlertDialogContent.js.map