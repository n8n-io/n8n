import { useBodyScrollLock } from "../shared/useBodyScrollLock.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useForwardPropsEmits } from "../shared/useForwardPropsEmits.js";
import { useHideOthers } from "../shared/useHideOthers.js";
import { injectPopoverRootContext } from "./PopoverRoot.js";
import { PopoverContentImpl_default } from "./PopoverContentImpl.js";
import { createBlock, defineComponent, mergeProps, openBlock, ref, renderSlot, unref, withCtx, withModifiers } from "vue";

//#region src/Popover/PopoverContentModal.vue?vue&type=script&setup=true&lang.ts
var PopoverContentModal_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "PopoverContentModal",
	props: {
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
		const rootContext = injectPopoverRootContext();
		const isRightClickOutsideRef = ref(false);
		useBodyScrollLock(true);
		const forwarded = useForwardPropsEmits(props, emits);
		const { forwardRef, currentElement } = useForwardExpose();
		useHideOthers(currentElement);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(PopoverContentImpl_default, mergeProps(unref(forwarded), {
				ref: unref(forwardRef),
				"trap-focus": unref(rootContext).open.value,
				"disable-outside-pointer-events": "",
				onCloseAutoFocus: _cache[0] || (_cache[0] = withModifiers((event) => {
					emits("closeAutoFocus", event);
					if (!isRightClickOutsideRef.value) unref(rootContext).triggerElement.value?.focus();
				}, ["prevent"])),
				onPointerDownOutside: _cache[1] || (_cache[1] = (event) => {
					emits("pointerDownOutside", event);
					const originalEvent = event.detail.originalEvent;
					const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true;
					const isRightClick = originalEvent.button === 2 || ctrlLeftClick;
					isRightClickOutsideRef.value = isRightClick;
				}),
				onFocusOutside: _cache[2] || (_cache[2] = withModifiers(() => {}, ["prevent"]))
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["trap-focus"]);
		};
	}
});

//#endregion
//#region src/Popover/PopoverContentModal.vue
var PopoverContentModal_default = PopoverContentModal_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { PopoverContentModal_default };
//# sourceMappingURL=PopoverContentModal.js.map