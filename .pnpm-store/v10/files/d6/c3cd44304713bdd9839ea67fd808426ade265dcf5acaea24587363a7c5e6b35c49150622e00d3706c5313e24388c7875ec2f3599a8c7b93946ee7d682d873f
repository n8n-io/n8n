const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Collapsible_CollapsibleContent = require('../Collapsible/CollapsibleContent.cjs');
const require_Accordion_AccordionRoot = require('./AccordionRoot.cjs');
const require_Accordion_AccordionItem = require('./AccordionItem.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Accordion/AccordionContent.vue?vue&type=script&setup=true&lang.ts
var AccordionContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const rootContext = require_Accordion_AccordionRoot.injectAccordionRootContext();
		const itemContext = require_Accordion_AccordionItem.injectAccordionItemContext();
		require_shared_useForwardExpose.useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Collapsible_CollapsibleContent.CollapsibleContent_default), {
				role: "region",
				"as-child": props.asChild,
				as: _ctx.as,
				"force-mount": props.forceMount,
				"aria-labelledby": (0, vue.unref)(itemContext).triggerId,
				"data-state": (0, vue.unref)(itemContext).dataState.value,
				"data-disabled": (0, vue.unref)(itemContext).dataDisabled.value,
				"data-orientation": (0, vue.unref)(rootContext).orientation,
				style: {
					"--reka-accordion-content-width": "var(--reka-collapsible-content-width)",
					"--reka-accordion-content-height": "var(--reka-collapsible-content-height)"
				},
				onContentFound: _cache[0] || (_cache[0] = ($event) => (0, vue.unref)(rootContext).changeModelValue((0, vue.unref)(itemContext).value.value))
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
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
Object.defineProperty(exports, 'AccordionContent_default', {
  enumerable: true,
  get: function () {
    return AccordionContent_default;
  }
});
//# sourceMappingURL=AccordionContent.cjs.map