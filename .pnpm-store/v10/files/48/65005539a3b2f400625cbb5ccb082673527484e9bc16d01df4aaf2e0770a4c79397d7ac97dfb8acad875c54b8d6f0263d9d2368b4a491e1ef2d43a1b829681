import { useId } from "../shared/useId.js";
import { CollapsibleTrigger_default } from "../Collapsible/CollapsibleTrigger.js";
import { injectAccordionRootContext } from "./AccordionRoot.js";
import { injectAccordionItemContext } from "./AccordionItem.js";
import { createBlock, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Accordion/AccordionTrigger.vue?vue&type=script&setup=true&lang.ts
var AccordionTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "AccordionTrigger",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectAccordionRootContext();
		const itemContext = injectAccordionItemContext();
		itemContext.triggerId ||= useId(void 0, "reka-accordion-trigger");
		function changeItem() {
			const triggerDisabled = rootContext.isSingle.value && itemContext.open.value && !rootContext.collapsible;
			if (itemContext.disabled.value || triggerDisabled) return;
			rootContext.changeModelValue(itemContext.value.value);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(CollapsibleTrigger_default), {
				id: unref(itemContext).triggerId,
				ref: unref(itemContext).currentRef,
				"data-reka-collection-item": "",
				as: props.as,
				"as-child": props.asChild,
				"aria-disabled": unref(itemContext).disabled.value || void 0,
				"aria-expanded": unref(itemContext).open.value || false,
				"data-disabled": unref(itemContext).dataDisabled.value,
				"data-orientation": unref(rootContext).orientation,
				"data-state": unref(itemContext).dataState.value,
				disabled: unref(itemContext).disabled.value,
				onClick: changeItem
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"id",
				"as",
				"as-child",
				"aria-disabled",
				"aria-expanded",
				"data-disabled",
				"data-orientation",
				"data-state",
				"disabled"
			]);
		};
	}
});

//#endregion
//#region src/Accordion/AccordionTrigger.vue
var AccordionTrigger_default = AccordionTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { AccordionTrigger_default };
//# sourceMappingURL=AccordionTrigger.js.map