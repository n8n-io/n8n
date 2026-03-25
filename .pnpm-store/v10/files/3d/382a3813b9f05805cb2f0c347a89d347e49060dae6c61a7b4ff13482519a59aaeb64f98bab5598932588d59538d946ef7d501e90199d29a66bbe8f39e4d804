import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useForwardPropsEmits } from "../shared/useForwardPropsEmits.js";
import { useId } from "../shared/useId.js";
import { Presence_default } from "../Presence/Presence.js";
import { injectPopoverRootContext } from "./PopoverRoot.js";
import { PopoverContentModal_default } from "./PopoverContentModal.js";
import { PopoverContentNonModal_default } from "./PopoverContentNonModal.js";
import { createBlock, createCommentVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Popover/PopoverContent.vue?vue&type=script&setup=true&lang.ts
var PopoverContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "PopoverContent",
	props: {
		forceMount: {
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
		const rootContext = injectPopoverRootContext();
		const forwarded = useForwardPropsEmits(props, emits);
		const { forwardRef } = useForwardExpose();
		rootContext.contentId ||= useId(void 0, "reka-popover-content");
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Presence_default), { present: _ctx.forceMount || unref(rootContext).open.value }, {
				default: withCtx(() => [unref(rootContext).modal.value ? (openBlock(), createBlock(PopoverContentModal_default, mergeProps({ key: 0 }, unref(forwarded), { ref: unref(forwardRef) }), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16)) : (openBlock(), createBlock(PopoverContentNonModal_default, mergeProps({ key: 1 }, unref(forwarded), { ref: unref(forwardRef) }), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16))]),
				_: 3
			}, 8, ["present"]);
		};
	}
});

//#endregion
//#region src/Popover/PopoverContent.vue
var PopoverContent_default = PopoverContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { PopoverContent_default };
//# sourceMappingURL=PopoverContent.js.map