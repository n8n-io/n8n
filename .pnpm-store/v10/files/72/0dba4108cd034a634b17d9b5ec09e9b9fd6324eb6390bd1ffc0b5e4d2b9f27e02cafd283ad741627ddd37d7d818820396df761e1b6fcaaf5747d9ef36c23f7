import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useId } from "../shared/useId.js";
import { Primitive } from "../Primitive/Primitive.js";
import { PopperAnchor_default } from "../Popper/PopperAnchor.js";
import { injectPopoverRootContext } from "./PopoverRoot.js";
import { createBlock, createVNode, defineComponent, onMounted, openBlock, renderSlot, resolveDynamicComponent, unref, withCtx } from "vue";

//#region src/Popover/PopoverTrigger.vue?vue&type=script&setup=true&lang.ts
var PopoverTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "PopoverTrigger",
	props: {
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
		const rootContext = injectPopoverRootContext();
		const { forwardRef, currentElement: triggerElement } = useForwardExpose();
		rootContext.triggerId ||= useId(void 0, "reka-popover-trigger");
		onMounted(() => {
			rootContext.triggerElement.value = triggerElement.value;
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(resolveDynamicComponent(unref(rootContext).hasCustomAnchor.value ? unref(Primitive) : unref(PopperAnchor_default)), { "as-child": "" }, {
				default: withCtx(() => [createVNode(unref(Primitive), {
					id: unref(rootContext).triggerId,
					ref: unref(forwardRef),
					type: _ctx.as === "button" ? "button" : void 0,
					"aria-haspopup": "dialog",
					"aria-expanded": unref(rootContext).open.value,
					"aria-controls": unref(rootContext).contentId,
					"data-state": unref(rootContext).open.value ? "open" : "closed",
					as: _ctx.as,
					"as-child": props.asChild,
					onClick: unref(rootContext).onOpenToggle
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"id",
					"type",
					"aria-expanded",
					"aria-controls",
					"data-state",
					"as",
					"as-child",
					"onClick"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Popover/PopoverTrigger.vue
var PopoverTrigger_default = PopoverTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { PopoverTrigger_default };
//# sourceMappingURL=PopoverTrigger.js.map