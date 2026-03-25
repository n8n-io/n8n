import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectAccordionRootContext } from "./AccordionRoot.js";
import { injectAccordionItemContext } from "./AccordionItem.js";
import { createBlock, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Accordion/AccordionHeader.vue?vue&type=script&setup=true&lang.ts
var AccordionHeader_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "AccordionHeader",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "h3"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectAccordionRootContext();
		const itemContext = injectAccordionItemContext();
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				as: props.as,
				"as-child": props.asChild,
				"data-orientation": unref(rootContext).orientation,
				"data-state": unref(itemContext).dataState.value,
				"data-disabled": unref(itemContext).dataDisabled.value
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"data-orientation",
				"data-state",
				"data-disabled"
			]);
		};
	}
});

//#endregion
//#region src/Accordion/AccordionHeader.vue
var AccordionHeader_default = AccordionHeader_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { AccordionHeader_default };
//# sourceMappingURL=AccordionHeader.js.map