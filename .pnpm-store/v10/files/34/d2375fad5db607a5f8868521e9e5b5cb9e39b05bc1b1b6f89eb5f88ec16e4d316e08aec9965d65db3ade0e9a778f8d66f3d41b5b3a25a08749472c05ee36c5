import { useFocusGuards } from "../shared/useFocusGuards.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useForwardProps } from "../shared/useForwardProps.js";
import { DismissableLayer_default } from "../DismissableLayer/DismissableLayer.js";
import { FocusScope_default } from "../FocusScope/FocusScope.js";
import { PopperContent_default } from "../Popper/PopperContent.js";
import { injectPopoverRootContext } from "./PopoverRoot.js";
import { createBlock, createVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";
import { reactiveOmit } from "@vueuse/shared";

//#region src/Popover/PopoverContentImpl.vue?vue&type=script&setup=true&lang.ts
var PopoverContentImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "PopoverContentImpl",
	props: {
		trapFocus: {
			type: Boolean,
			required: false
		},
		side: {
			type: null,
			required: false
		},
		sideOffset: {
			type: Number,
			required: false
		},
		sideFlip: {
			type: Boolean,
			required: false
		},
		align: {
			type: null,
			required: false
		},
		alignOffset: {
			type: Number,
			required: false
		},
		alignFlip: {
			type: Boolean,
			required: false
		},
		avoidCollisions: {
			type: Boolean,
			required: false
		},
		collisionBoundary: {
			type: null,
			required: false
		},
		collisionPadding: {
			type: [Number, Object],
			required: false
		},
		arrowPadding: {
			type: Number,
			required: false
		},
		sticky: {
			type: String,
			required: false
		},
		hideWhenDetached: {
			type: Boolean,
			required: false
		},
		positionStrategy: {
			type: String,
			required: false
		},
		updatePositionStrategy: {
			type: String,
			required: false
		},
		disableUpdateOnLayoutShift: {
			type: Boolean,
			required: false
		},
		prioritizePosition: {
			type: Boolean,
			required: false
		},
		reference: {
			type: null,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		},
		disableOutsidePointerEvents: {
			type: Boolean,
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
		const forwarded = useForwardProps(reactiveOmit(props, "trapFocus", "disableOutsidePointerEvents"));
		const { forwardRef } = useForwardExpose();
		const rootContext = injectPopoverRootContext();
		useFocusGuards();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(FocusScope_default), {
				"as-child": "",
				loop: "",
				trapped: _ctx.trapFocus,
				onMountAutoFocus: _cache[5] || (_cache[5] = ($event) => emits("openAutoFocus", $event)),
				onUnmountAutoFocus: _cache[6] || (_cache[6] = ($event) => emits("closeAutoFocus", $event))
			}, {
				default: withCtx(() => [createVNode(unref(DismissableLayer_default), {
					"as-child": "",
					"disable-outside-pointer-events": _ctx.disableOutsidePointerEvents,
					onPointerDownOutside: _cache[0] || (_cache[0] = ($event) => emits("pointerDownOutside", $event)),
					onInteractOutside: _cache[1] || (_cache[1] = ($event) => emits("interactOutside", $event)),
					onEscapeKeyDown: _cache[2] || (_cache[2] = ($event) => emits("escapeKeyDown", $event)),
					onFocusOutside: _cache[3] || (_cache[3] = ($event) => emits("focusOutside", $event)),
					onDismiss: _cache[4] || (_cache[4] = ($event) => unref(rootContext).onOpenChange(false))
				}, {
					default: withCtx(() => [createVNode(unref(PopperContent_default), mergeProps(unref(forwarded), {
						id: unref(rootContext).contentId,
						ref: unref(forwardRef),
						"data-state": unref(rootContext).open.value ? "open" : "closed",
						"aria-labelledby": unref(rootContext).triggerId,
						style: {
							"--reka-popover-content-transform-origin": "var(--reka-popper-transform-origin)",
							"--reka-popover-content-available-width": "var(--reka-popper-available-width)",
							"--reka-popover-content-available-height": "var(--reka-popper-available-height)",
							"--reka-popover-trigger-width": "var(--reka-popper-anchor-width)",
							"--reka-popover-trigger-height": "var(--reka-popper-anchor-height)"
						},
						role: "dialog"
					}), {
						default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
						_: 3
					}, 16, [
						"id",
						"data-state",
						"aria-labelledby"
					])]),
					_: 3
				}, 8, ["disable-outside-pointer-events"])]),
				_: 3
			}, 8, ["trapped"]);
		};
	}
});

//#endregion
//#region src/Popover/PopoverContentImpl.vue
var PopoverContentImpl_default = PopoverContentImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { PopoverContentImpl_default };
//# sourceMappingURL=PopoverContentImpl.js.map