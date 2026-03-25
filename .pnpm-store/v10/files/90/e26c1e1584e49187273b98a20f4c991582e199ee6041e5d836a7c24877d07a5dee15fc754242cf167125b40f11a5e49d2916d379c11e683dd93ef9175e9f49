import { useForwardExpose } from "../shared/useForwardExpose.js";
import { DismissableLayer_default } from "../DismissableLayer/DismissableLayer.js";
import { VisuallyHidden_default } from "../VisuallyHidden/VisuallyHidden.js";
import { PopperContent_default } from "../Popper/PopperContent.js";
import { TOOLTIP_OPEN } from "./utils.js";
import { injectTooltipRootContext } from "./TooltipRoot.js";
import { Comment, computed, createBlock, createTextVNode, createVNode, defineComponent, mergeProps, onMounted, openBlock, renderSlot, toDisplayString, unref, useSlots, withCtx, withModifiers } from "vue";
import { useEventListener } from "@vueuse/core";

//#region src/Tooltip/TooltipContentImpl.vue?vue&type=script&setup=true&lang.ts
var TooltipContentImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "TooltipContentImpl",
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
			required: false,
			default: "top"
		},
		sideOffset: {
			type: Number,
			required: false,
			default: 0
		},
		align: {
			type: null,
			required: false,
			default: "center"
		},
		alignOffset: {
			type: Number,
			required: false
		},
		avoidCollisions: {
			type: Boolean,
			required: false,
			default: true
		},
		collisionBoundary: {
			type: null,
			required: false,
			default: () => []
		},
		collisionPadding: {
			type: [Number, Object],
			required: false,
			default: 0
		},
		arrowPadding: {
			type: Number,
			required: false,
			default: 0
		},
		sticky: {
			type: String,
			required: false,
			default: "partial"
		},
		hideWhenDetached: {
			type: Boolean,
			required: false,
			default: false
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
		const { forwardRef } = useForwardExpose();
		const slot = useSlots();
		const defaultSlot = computed(() => slot.default?.({}));
		const ariaLabel = computed(() => {
			if (props.ariaLabel) return props.ariaLabel;
			let content = "";
			function recursiveTextSearch(node) {
				if (typeof node.children === "string" && node.type !== Comment) content += node.children;
				else if (Array.isArray(node.children)) node.children.forEach((child) => recursiveTextSearch(child));
			}
			defaultSlot.value?.forEach((node) => recursiveTextSearch(node));
			return content;
		});
		const popperContentProps = computed(() => {
			const { ariaLabel: _,...restProps } = props;
			return restProps;
		});
		onMounted(() => {
			useEventListener(window, "scroll", (event) => {
				const target = event.target;
				if (target?.contains(rootContext.trigger.value)) rootContext.onClose();
			});
			useEventListener(window, TOOLTIP_OPEN, rootContext.onClose);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DismissableLayer_default), {
				"as-child": "",
				"disable-outside-pointer-events": false,
				onEscapeKeyDown: _cache[0] || (_cache[0] = ($event) => emits("escapeKeyDown", $event)),
				onPointerDownOutside: _cache[1] || (_cache[1] = (event) => {
					if (unref(rootContext).disableClosingTrigger.value && unref(rootContext).trigger.value?.contains(event.target)) event.preventDefault();
					emits("pointerDownOutside", event);
				}),
				onFocusOutside: _cache[2] || (_cache[2] = withModifiers(() => {}, ["prevent"])),
				onDismiss: _cache[3] || (_cache[3] = ($event) => unref(rootContext).onClose())
			}, {
				default: withCtx(() => [createVNode(unref(PopperContent_default), mergeProps({
					ref: unref(forwardRef),
					"data-state": unref(rootContext).stateAttribute.value
				}, {
					..._ctx.$attrs,
					...popperContentProps.value
				}, { style: {
					"--reka-tooltip-content-transform-origin": "var(--reka-popper-transform-origin)",
					"--reka-tooltip-content-available-width": "var(--reka-popper-available-width)",
					"--reka-tooltip-content-available-height": "var(--reka-popper-available-height)",
					"--reka-tooltip-trigger-width": "var(--reka-popper-anchor-width)",
					"--reka-tooltip-trigger-height": "var(--reka-popper-anchor-height)"
				} }), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default"), createVNode(unref(VisuallyHidden_default), {
						id: unref(rootContext).contentId,
						role: "tooltip"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(ariaLabel.value), 1)]),
						_: 1
					}, 8, ["id"])]),
					_: 3
				}, 16, ["data-state"])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Tooltip/TooltipContentImpl.vue
var TooltipContentImpl_default = TooltipContentImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TooltipContentImpl_default };
//# sourceMappingURL=TooltipContentImpl.js.map