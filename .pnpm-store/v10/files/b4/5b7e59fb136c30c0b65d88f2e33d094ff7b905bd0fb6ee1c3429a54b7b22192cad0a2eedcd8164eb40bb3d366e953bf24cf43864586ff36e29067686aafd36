import { getActiveElement } from "../shared/getActiveElement.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useId } from "../shared/useId.js";
import { injectDialogRootContext } from "./DialogRoot.js";
import { DismissableLayer_default } from "../DismissableLayer/DismissableLayer.js";
import { FocusScope_default } from "../FocusScope/FocusScope.js";
import { getOpenState } from "../Menu/utils.js";
import { useWarning } from "./utils.js";
import { createBlock, createVNode, defineComponent, mergeProps, onMounted, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Dialog/DialogContentImpl.vue?vue&type=script&setup=true&lang.ts
var DialogContentImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "DialogContentImpl",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		trapFocus: {
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
		const rootContext = injectDialogRootContext();
		const { forwardRef, currentElement: contentElement } = useForwardExpose();
		rootContext.titleId ||= useId(void 0, "reka-dialog-title");
		rootContext.descriptionId ||= useId(void 0, "reka-dialog-description");
		onMounted(() => {
			rootContext.contentElement = contentElement;
			if (getActiveElement() !== document.body) rootContext.triggerElement.value = getActiveElement();
		});
		if (process.env.NODE_ENV !== "production") useWarning({
			titleName: "DialogTitle",
			contentName: "DialogContent",
			componentLink: "dialog.html#title",
			titleId: rootContext.titleId,
			descriptionId: rootContext.descriptionId,
			contentElement
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(FocusScope_default), {
				"as-child": "",
				loop: "",
				trapped: props.trapFocus,
				onMountAutoFocus: _cache[5] || (_cache[5] = ($event) => emits("openAutoFocus", $event)),
				onUnmountAutoFocus: _cache[6] || (_cache[6] = ($event) => emits("closeAutoFocus", $event))
			}, {
				default: withCtx(() => [createVNode(unref(DismissableLayer_default), mergeProps({
					id: unref(rootContext).contentId,
					ref: unref(forwardRef),
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"disable-outside-pointer-events": _ctx.disableOutsidePointerEvents,
					role: "dialog",
					"aria-describedby": unref(rootContext).descriptionId,
					"aria-labelledby": unref(rootContext).titleId,
					"data-state": unref(getOpenState)(unref(rootContext).open.value)
				}, _ctx.$attrs, {
					onDismiss: _cache[0] || (_cache[0] = ($event) => unref(rootContext).onOpenChange(false)),
					onEscapeKeyDown: _cache[1] || (_cache[1] = ($event) => emits("escapeKeyDown", $event)),
					onFocusOutside: _cache[2] || (_cache[2] = ($event) => emits("focusOutside", $event)),
					onInteractOutside: _cache[3] || (_cache[3] = ($event) => emits("interactOutside", $event)),
					onPointerDownOutside: _cache[4] || (_cache[4] = ($event) => emits("pointerDownOutside", $event))
				}), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"id",
					"as",
					"as-child",
					"disable-outside-pointer-events",
					"aria-describedby",
					"aria-labelledby",
					"data-state"
				])]),
				_: 3
			}, 8, ["trapped"]);
		};
	}
});

//#endregion
//#region src/Dialog/DialogContentImpl.vue
var DialogContentImpl_default = DialogContentImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { DialogContentImpl_default };
//# sourceMappingURL=DialogContentImpl.js.map