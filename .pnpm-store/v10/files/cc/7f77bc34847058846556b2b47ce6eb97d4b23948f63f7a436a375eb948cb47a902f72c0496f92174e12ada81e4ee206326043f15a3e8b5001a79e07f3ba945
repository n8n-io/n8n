import { createContext } from "../shared/createContext.js";
import { useArrowNavigation } from "../shared/useArrowNavigation.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { CollapsibleRoot_default } from "../Collapsible/CollapsibleRoot.js";
import { injectAccordionRootContext } from "./AccordionRoot.js";
import { computed, createBlock, defineComponent, openBlock, renderSlot, unref, withCtx, withKeys } from "vue";

//#region src/Accordion/AccordionItem.vue?vue&type=script&setup=true&lang.ts
var AccordionItemState = /* @__PURE__ */ function(AccordionItemState$1) {
	AccordionItemState$1["Open"] = "open";
	AccordionItemState$1["Closed"] = "closed";
	return AccordionItemState$1;
}(AccordionItemState || {});
const [injectAccordionItemContext, provideAccordionItemContext] = createContext("AccordionItem");
var AccordionItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "AccordionItem",
	props: {
		disabled: {
			type: Boolean,
			required: false
		},
		value: {
			type: String,
			required: true
		},
		unmountOnHide: {
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
	setup(__props, { expose: __expose }) {
		const props = __props;
		const rootContext = injectAccordionRootContext();
		const open = computed(() => rootContext.isSingle.value ? props.value === rootContext.modelValue.value : Array.isArray(rootContext.modelValue.value) && rootContext.modelValue.value.includes(props.value));
		const disabled = computed(() => {
			return rootContext.disabled.value || props.disabled;
		});
		const dataDisabled = computed(() => disabled.value ? "" : void 0);
		const dataState = computed(() => open.value ? AccordionItemState.Open : AccordionItemState.Closed);
		__expose({
			open,
			dataDisabled
		});
		const { currentRef, currentElement } = useForwardExpose();
		provideAccordionItemContext({
			open,
			dataState,
			disabled,
			dataDisabled,
			triggerId: "",
			currentRef,
			currentElement,
			value: computed(() => props.value)
		});
		function handleArrowKey(e) {
			const target = e.target;
			const allCollectionItems = Array.from(rootContext.parentElement.value?.querySelectorAll("[data-reka-collection-item]") ?? []);
			const collectionItemIndex = allCollectionItems.findIndex((item) => item === target);
			if (collectionItemIndex === -1) return null;
			useArrowNavigation(e, target, rootContext.parentElement.value, {
				arrowKeyOptions: rootContext.orientation,
				dir: rootContext.direction.value,
				focus: true
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(CollapsibleRoot_default), {
				"data-orientation": unref(rootContext).orientation,
				"data-disabled": dataDisabled.value,
				"data-state": dataState.value,
				disabled: disabled.value,
				open: open.value,
				as: props.as,
				"as-child": props.asChild,
				"unmount-on-hide": unref(rootContext).unmountOnHide.value,
				onKeydown: withKeys(handleArrowKey, [
					"up",
					"down",
					"left",
					"right",
					"home",
					"end"
				])
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { open: open.value })]),
				_: 3
			}, 8, [
				"data-orientation",
				"data-disabled",
				"data-state",
				"disabled",
				"open",
				"as",
				"as-child",
				"unmount-on-hide"
			]);
		};
	}
});

//#endregion
//#region src/Accordion/AccordionItem.vue
var AccordionItem_default = AccordionItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { AccordionItem_default, injectAccordionItemContext };
//# sourceMappingURL=AccordionItem.js.map