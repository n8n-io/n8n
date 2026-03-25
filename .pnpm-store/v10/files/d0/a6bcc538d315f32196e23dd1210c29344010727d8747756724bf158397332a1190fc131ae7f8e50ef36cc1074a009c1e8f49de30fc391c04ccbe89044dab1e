import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useForwardPropsEmits } from "../shared/useForwardPropsEmits.js";
import { Presence_default } from "../Presence/Presence.js";
import { injectTooltipRootContext } from "./TooltipRoot.js";
import { TooltipContentImpl_default } from "./TooltipContentImpl.js";
import { TooltipContentHoverable_default } from "./TooltipContentHoverable.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, resolveDynamicComponent, unref, withCtx } from "vue";

//#region src/Tooltip/TooltipContent.vue?vue&type=script&setup=true&lang.ts
var TooltipContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "TooltipContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		ariaLabel: {
			type: String,
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
		side: {
			type: null,
			required: false,
			default: "top"
		},
		sideOffset: {
			type: Number,
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
		}
	},
	emits: ["escapeKeyDown", "pointerDownOutside"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = injectTooltipRootContext();
		const forwarded = useForwardPropsEmits(props, emits);
		const { forwardRef } = useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Presence_default), { present: _ctx.forceMount || unref(rootContext).open.value }, {
				default: withCtx(() => [(openBlock(), createBlock(resolveDynamicComponent(unref(rootContext).disableHoverableContent.value ? TooltipContentImpl_default : TooltipContentHoverable_default), mergeProps({ ref: unref(forwardRef) }, unref(forwarded)), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16))]),
				_: 3
			}, 8, ["present"]);
		};
	}
});

//#endregion
//#region src/Tooltip/TooltipContent.vue
var TooltipContent_default = TooltipContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TooltipContent_default };
//# sourceMappingURL=TooltipContent.js.map