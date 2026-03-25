import { useForwardExpose } from "../shared/useForwardExpose.js";
import { CollapsibleContent_default } from "../Collapsible/CollapsibleContent.js";
import { injectAccordionRootContext } from "./AccordionRoot.js";
import { injectAccordionItemContext } from "./AccordionItem.js";
import { createBlock, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Accordion/AccordionContent.vue?vue&type=script&setup=true&lang.ts
var AccordionContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "AccordionContent",
	props: {
		forceMount: {
			type: Boolean,
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
	setup(__props) {
		const props = __props;
		const rootContext = injectAccordionRootContext();
		const itemContext = injectAccordionItemContext();
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(CollapsibleContent_default), {
				role: "region",
				"as-child": props.asChild,
				as: _ctx.as,
				"force-mount": props.forceMount,
				"aria-labelledby": unref(itemContext).triggerId,
				"data-state": unref(itemContext).dataState.value,
				"data-disabled": unref(itemContext).dataDisabled.value,
				"data-orientation": unref(rootContext).orientation,
				style: {
					"--reka-accordion-content-width": "var(--reka-collapsible-content-width)",
					"--reka-accordion-content-height": "var(--reka-collapsible-content-height)"
				},
				onContentFound: _cache[0] || (_cache[0] = ($event) => unref(rootContext).changeModelValue(unref(itemContext).value.value))
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as-child",
				"as",
				"force-mount",
				"aria-labelledby",
				"data-state",
				"data-disabled",
				"data-orientation"
			]);
		};
	}
});

//#endregion
//#region src/Accordion/AccordionContent.vue
var AccordionContent_default = AccordionContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { AccordionContent_default };
//# sourceMappingURL=AccordionContent.js.map