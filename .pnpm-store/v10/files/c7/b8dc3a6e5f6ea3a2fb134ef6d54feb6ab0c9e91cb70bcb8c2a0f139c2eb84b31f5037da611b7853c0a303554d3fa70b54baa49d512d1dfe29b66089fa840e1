const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collapsible_CollapsibleRoot = require('./CollapsibleRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Collapsible/CollapsibleTrigger.vue?vue&type=script&setup=true&lang.ts
var CollapsibleTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "CollapsibleTrigger",
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
		require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Collapsible_CollapsibleRoot.injectCollapsibleRootContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				type: _ctx.as === "button" ? "button" : void 0,
				as: _ctx.as,
				"as-child": props.asChild,
				"aria-controls": (0, vue.unref)(rootContext).contentId,
				"aria-expanded": (0, vue.unref)(rootContext).open.value,
				"data-state": (0, vue.unref)(rootContext).open.value ? "open" : "closed",
				"data-disabled": (0, vue.unref)(rootContext).disabled?.value ? "" : void 0,
				disabled: (0, vue.unref)(rootContext).disabled?.value,
				onClick: (0, vue.unref)(rootContext).onOpenToggle
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"type",
				"as",
				"as-child",
				"aria-controls",
				"aria-expanded",
				"data-state",
				"data-disabled",
				"disabled",
				"onClick"
			]);
		};
	}
});

//#endregion
//#region src/Collapsible/CollapsibleTrigger.vue
var CollapsibleTrigger_default = CollapsibleTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'CollapsibleTrigger_default', {
  enumerable: true,
  get: function () {
    return CollapsibleTrigger_default;
  }
});
//# sourceMappingURL=CollapsibleTrigger.cjs.map