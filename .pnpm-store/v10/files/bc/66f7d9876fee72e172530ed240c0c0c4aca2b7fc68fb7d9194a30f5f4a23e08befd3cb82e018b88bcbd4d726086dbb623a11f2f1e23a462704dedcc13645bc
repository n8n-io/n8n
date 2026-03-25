const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Accordion_AccordionRoot = require('./AccordionRoot.cjs');
const require_Accordion_AccordionItem = require('./AccordionItem.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Accordion/AccordionHeader.vue?vue&type=script&setup=true&lang.ts
var AccordionHeader_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const rootContext = require_Accordion_AccordionRoot.injectAccordionRootContext();
		const itemContext = require_Accordion_AccordionItem.injectAccordionItemContext();
		require_shared_useForwardExpose.useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				as: props.as,
				"as-child": props.asChild,
				"data-orientation": (0, vue.unref)(rootContext).orientation,
				"data-state": (0, vue.unref)(itemContext).dataState.value,
				"data-disabled": (0, vue.unref)(itemContext).dataDisabled.value
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
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
Object.defineProperty(exports, 'AccordionHeader_default', {
  enumerable: true,
  get: function () {
    return AccordionHeader_default;
  }
});
//# sourceMappingURL=AccordionHeader.cjs.map