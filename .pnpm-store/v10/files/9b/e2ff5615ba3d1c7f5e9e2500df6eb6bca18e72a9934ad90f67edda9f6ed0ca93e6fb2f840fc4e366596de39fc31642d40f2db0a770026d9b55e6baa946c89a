const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useArrowNavigation = require('../shared/useArrowNavigation.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Collapsible_CollapsibleRoot = require('../Collapsible/CollapsibleRoot.cjs');
const require_Accordion_AccordionRoot = require('./AccordionRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Accordion/AccordionItem.vue?vue&type=script&setup=true&lang.ts
var AccordionItemState = /* @__PURE__ */ function(AccordionItemState$1) {
	AccordionItemState$1["Open"] = "open";
	AccordionItemState$1["Closed"] = "closed";
	return AccordionItemState$1;
}(AccordionItemState || {});
const [injectAccordionItemContext, provideAccordionItemContext] = require_shared_createContext.createContext("AccordionItem");
var AccordionItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const rootContext = require_Accordion_AccordionRoot.injectAccordionRootContext();
		const open = (0, vue.computed)(() => rootContext.isSingle.value ? props.value === rootContext.modelValue.value : Array.isArray(rootContext.modelValue.value) && rootContext.modelValue.value.includes(props.value));
		const disabled = (0, vue.computed)(() => {
			return rootContext.disabled.value || props.disabled;
		});
		const dataDisabled = (0, vue.computed)(() => disabled.value ? "" : void 0);
		const dataState = (0, vue.computed)(() => open.value ? AccordionItemState.Open : AccordionItemState.Closed);
		__expose({
			open,
			dataDisabled
		});
		const { currentRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		provideAccordionItemContext({
			open,
			dataState,
			disabled,
			dataDisabled,
			triggerId: "",
			currentRef,
			currentElement,
			value: (0, vue.computed)(() => props.value)
		});
		function handleArrowKey(e) {
			const target = e.target;
			const allCollectionItems = Array.from(rootContext.parentElement.value?.querySelectorAll("[data-reka-collection-item]") ?? []);
			const collectionItemIndex = allCollectionItems.findIndex((item) => item === target);
			if (collectionItemIndex === -1) return null;
			require_shared_useArrowNavigation.useArrowNavigation(e, target, rootContext.parentElement.value, {
				arrowKeyOptions: rootContext.orientation,
				dir: rootContext.direction.value,
				focus: true
			});
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Collapsible_CollapsibleRoot.CollapsibleRoot_default), {
				"data-orientation": (0, vue.unref)(rootContext).orientation,
				"data-disabled": dataDisabled.value,
				"data-state": dataState.value,
				disabled: disabled.value,
				open: open.value,
				as: props.as,
				"as-child": props.asChild,
				"unmount-on-hide": (0, vue.unref)(rootContext).unmountOnHide.value,
				onKeydown: (0, vue.withKeys)(handleArrowKey, [
					"up",
					"down",
					"left",
					"right",
					"home",
					"end"
				])
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { open: open.value })]),
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
Object.defineProperty(exports, 'AccordionItem_default', {
  enumerable: true,
  get: function () {
    return AccordionItem_default;
  }
});
Object.defineProperty(exports, 'injectAccordionItemContext', {
  enumerable: true,
  get: function () {
    return injectAccordionItemContext;
  }
});
//# sourceMappingURL=AccordionItem.cjs.map