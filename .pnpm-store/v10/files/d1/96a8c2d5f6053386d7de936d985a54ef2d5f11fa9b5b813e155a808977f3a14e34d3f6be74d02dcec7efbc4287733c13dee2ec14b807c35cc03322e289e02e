import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useForwardPropsEmits } from "../shared/useForwardPropsEmits.js";
import { MenuSubContent_default } from "../Menu/MenuSubContent.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/ContextMenu/ContextMenuSubContent.vue?vue&type=script&setup=true&lang.ts
var ContextMenuSubContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ContextMenuSubContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		loop: {
			type: Boolean,
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
		}
	},
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"entryFocus",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardPropsEmits(props, emits);
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(MenuSubContent_default), mergeProps(unref(forwarded), { style: {
				"--reka-context-menu-content-transform-origin": "var(--reka-popper-transform-origin)",
				"--reka-context-menu-content-available-width": "var(--reka-popper-available-width)",
				"--reka-context-menu-content-available-height": "var(--reka-popper-available-height)",
				"--reka-context-menu-trigger-width": "var(--reka-popper-anchor-width)",
				"--reka-context-menu-trigger-height": "var(--reka-popper-anchor-height)"
			} }), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/ContextMenu/ContextMenuSubContent.vue
var ContextMenuSubContent_default = ContextMenuSubContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ContextMenuSubContent_default };
//# sourceMappingURL=ContextMenuSubContent.js.map