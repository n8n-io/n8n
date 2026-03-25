import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectCollapsibleRootContext } from "./CollapsibleRoot.js";
import { createBlock, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Collapsible/CollapsibleTrigger.vue?vue&type=script&setup=true&lang.ts
var CollapsibleTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		useForwardExpose();
		const rootContext = injectCollapsibleRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				type: _ctx.as === "button" ? "button" : void 0,
				as: _ctx.as,
				"as-child": props.asChild,
				"aria-controls": unref(rootContext).contentId,
				"aria-expanded": unref(rootContext).open.value,
				"data-state": unref(rootContext).open.value ? "open" : "closed",
				"data-disabled": unref(rootContext).disabled?.value ? "" : void 0,
				disabled: unref(rootContext).disabled?.value,
				onClick: unref(rootContext).onOpenToggle
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
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
export { CollapsibleTrigger_default };
//# sourceMappingURL=CollapsibleTrigger.js.map