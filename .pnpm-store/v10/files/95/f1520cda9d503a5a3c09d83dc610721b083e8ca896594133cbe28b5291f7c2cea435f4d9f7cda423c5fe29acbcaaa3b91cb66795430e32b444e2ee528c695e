import { useForwardPropsEmits } from "../shared/useForwardPropsEmits.js";
import { injectPopoverRootContext } from "./PopoverRoot.js";
import { PopoverContentImpl_default } from "./PopoverContentImpl.js";
import { createBlock, defineComponent, mergeProps, openBlock, ref, renderSlot, unref, withCtx } from "vue";

//#region src/Popover/PopoverContentNonModal.vue?vue&type=script&setup=true&lang.ts
var PopoverContentNonModal_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "PopoverContentNonModal",
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
		const hasInteractedOutsideRef = ref(false);
		const hasPointerDownOutsideRef = ref(false);
		const forwarded = useForwardPropsEmits(props, emits);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(PopoverContentImpl_default, mergeProps(unref(forwarded), {
				"trap-focus": false,
				"disable-outside-pointer-events": false,
				onCloseAutoFocus: _cache[0] || (_cache[0] = (event) => {
					emits("closeAutoFocus", event);
					if (!event.defaultPrevented) {
						if (!hasInteractedOutsideRef.value) unref(rootContext).triggerElement.value?.focus();
						event.preventDefault();
					}
					hasInteractedOutsideRef.value = false;
					hasPointerDownOutsideRef.value = false;
				}),
				onInteractOutside: _cache[1] || (_cache[1] = async (event) => {
					emits("interactOutside", event);
					if (!event.defaultPrevented) {
						hasInteractedOutsideRef.value = true;
						if (event.detail.originalEvent.type === "pointerdown") hasPointerDownOutsideRef.value = true;
					}
					const target = event.target;
					const targetIsTrigger = unref(rootContext).triggerElement.value?.contains(target);
					if (targetIsTrigger) event.preventDefault();
					if (event.detail.originalEvent.type === "focusin" && hasPointerDownOutsideRef.value) event.preventDefault();
				})
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Popover/PopoverContentNonModal.vue
var PopoverContentNonModal_default = PopoverContentNonModal_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { PopoverContentNonModal_default };
//# sourceMappingURL=PopoverContentNonModal.js.map