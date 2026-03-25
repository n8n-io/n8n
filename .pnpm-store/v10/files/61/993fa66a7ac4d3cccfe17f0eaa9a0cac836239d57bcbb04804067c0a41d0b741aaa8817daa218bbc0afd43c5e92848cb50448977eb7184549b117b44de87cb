import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useId } from "../shared/useId.js";
import { Primitive } from "../Primitive/Primitive.js";
import { PopperAnchor_default } from "../Popper/PopperAnchor.js";
import { injectTooltipProviderContext } from "./TooltipProvider.js";
import { injectTooltipRootContext } from "./TooltipRoot.js";
import { computed, createBlock, createVNode, defineComponent, mergeProps, onMounted, openBlock, ref, renderSlot, toHandlers, unref, withCtx } from "vue";

//#region src/Tooltip/TooltipTrigger.vue?vue&type=script&setup=true&lang.ts
var TooltipTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "TooltipTrigger",
	props: {
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
			required: false,
			default: "button"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectTooltipRootContext();
		const providerContext = injectTooltipProviderContext();
		rootContext.contentId ||= useId(void 0, "reka-tooltip-content");
		const { forwardRef, currentElement: triggerElement } = useForwardExpose();
		const isPointerDown = ref(false);
		const hasPointerMoveOpened = ref(false);
		const tooltipListeners = computed(() => {
			if (rootContext.disabled.value) return {};
			return {
				click: handleClick,
				focus: handleFocus,
				pointermove: handlePointerMove,
				pointerleave: handlePointerLeave,
				pointerdown: handlePointerDown,
				blur: handleBlur
			};
		});
		onMounted(() => {
			rootContext.onTriggerChange(triggerElement.value);
		});
		function handlePointerUp() {
			setTimeout(() => {
				isPointerDown.value = false;
			}, 1);
		}
		function handlePointerDown() {
			if (rootContext.open && !rootContext.disableClosingTrigger.value) rootContext.onClose();
			isPointerDown.value = true;
			document.addEventListener("pointerup", handlePointerUp, { once: true });
		}
		function handlePointerMove(event) {
			if (event.pointerType === "touch") return;
			if (!hasPointerMoveOpened.value && !providerContext.isPointerInTransitRef.value) {
				rootContext.onTriggerEnter();
				hasPointerMoveOpened.value = true;
			}
		}
		function handlePointerLeave() {
			rootContext.onTriggerLeave();
			hasPointerMoveOpened.value = false;
		}
		function handleFocus(event) {
			if (isPointerDown.value) return;
			if (rootContext.ignoreNonKeyboardFocus.value && !event.target.matches?.(":focus-visible")) return;
			rootContext.onOpen();
		}
		function handleBlur() {
			rootContext.onClose();
		}
		function handleClick() {
			if (!rootContext.disableClosingTrigger.value) rootContext.onClose();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(PopperAnchor_default), {
				"as-child": "",
				reference: _ctx.reference
			}, {
				default: withCtx(() => [createVNode(unref(Primitive), mergeProps({
					ref: unref(forwardRef),
					"aria-describedby": unref(rootContext).open.value ? unref(rootContext).contentId : void 0,
					"data-state": unref(rootContext).stateAttribute.value,
					as: _ctx.as,
					"as-child": props.asChild,
					"data-grace-area-trigger": ""
				}, toHandlers(tooltipListeners.value)), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"aria-describedby",
					"data-state",
					"as",
					"as-child"
				])]),
				_: 3
			}, 8, ["reference"]);
		};
	}
});

//#endregion
//#region src/Tooltip/TooltipTrigger.vue
var TooltipTrigger_default = TooltipTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TooltipTrigger_default };
//# sourceMappingURL=TooltipTrigger.js.map