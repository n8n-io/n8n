const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Collapsible_CollapsibleTrigger = require('../Collapsible/CollapsibleTrigger.cjs');
const require_Accordion_AccordionRoot = require('./AccordionRoot.cjs');
const require_Accordion_AccordionItem = require('./AccordionItem.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Accordion/AccordionTrigger.vue?vue&type=script&setup=true&lang.ts
var AccordionTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const rootContext = require_Accordion_AccordionRoot.injectAccordionRootContext();
		const itemContext = require_Accordion_AccordionItem.injectAccordionItemContext();
		itemContext.triggerId ||= require_shared_useId.useId(void 0, "reka-accordion-trigger");
		function changeItem() {
			const triggerDisabled = rootContext.isSingle.value && itemContext.open.value && !rootContext.collapsible;
			if (itemContext.disabled.value || triggerDisabled) return;
			rootContext.changeModelValue(itemContext.value.value);
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Collapsible_CollapsibleTrigger.CollapsibleTrigger_default), {
				id: (0, vue.unref)(itemContext).triggerId,
				ref: (0, vue.unref)(itemContext).currentRef,
				"data-reka-collection-item": "",
				as: props.as,
				"as-child": props.asChild,
				"aria-disabled": (0, vue.unref)(itemContext).disabled.value || void 0,
				"aria-expanded": (0, vue.unref)(itemContext).open.value || false,
				"data-disabled": (0, vue.unref)(itemContext).dataDisabled.value,
				"data-orientation": (0, vue.unref)(rootContext).orientation,
				"data-state": (0, vue.unref)(itemContext).dataState.value,
				disabled: (0, vue.unref)(itemContext).disabled.value,
				onClick: changeItem
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
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
Object.defineProperty(exports, 'AccordionTrigger_default', {
  enumerable: true,
  get: function () {
    return AccordionTrigger_default;
  }
});
//# sourceMappingURL=AccordionTrigger.cjs.map