import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useForwardProps } from "../shared/useForwardProps.js";
import { useGraceArea } from "../shared/useGraceArea.js";
import { injectTooltipProviderContext } from "./TooltipProvider.js";
import { injectTooltipRootContext } from "./TooltipRoot.js";
import { TooltipContentImpl_default } from "./TooltipContentImpl.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Tooltip/TooltipContentHoverable.vue?vue&type=script&setup=true&lang.ts
var TooltipContentHoverable_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "TooltipContentHoverable",
	props: {
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
			required: false
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
	setup(__props) {
		const props = __props;
		const forwardedProps = useForwardProps(props);
		const { forwardRef, currentElement } = useForwardExpose();
		const { trigger, onClose } = injectTooltipRootContext();
		const providerContext = injectTooltipProviderContext();
		const { isPointerInTransit, onPointerExit } = useGraceArea(trigger, currentElement);
		providerContext.isPointerInTransitRef = isPointerInTransit;
		onPointerExit(() => {
			onClose();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(TooltipContentImpl_default, mergeProps({ ref: unref(forwardRef) }, unref(forwardedProps)), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Tooltip/TooltipContentHoverable.vue
var TooltipContentHoverable_default = TooltipContentHoverable_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TooltipContentHoverable_default };
//# sourceMappingURL=TooltipContentHoverable.js.map