import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Presence_default } from "../Presence/Presence.js";
import { Primitive } from "../Primitive/Primitive.js";
import { getState, isIndeterminate } from "./utils.js";
import { injectCheckboxRootContext } from "./CheckboxRoot.js";
import { createBlock, createVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Checkbox/CheckboxIndicator.vue?vue&type=script&setup=true&lang.ts
var CheckboxIndicator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "CheckboxIndicator",
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
			required: false,
			default: "span"
		}
	},
	setup(__props) {
		const { forwardRef } = useForwardExpose();
		const rootContext = injectCheckboxRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Presence_default), { present: _ctx.forceMount || unref(isIndeterminate)(unref(rootContext).state.value) || unref(rootContext).state.value === true }, {
				default: withCtx(() => [createVNode(unref(Primitive), mergeProps({
					ref: unref(forwardRef),
					"data-state": unref(getState)(unref(rootContext).state.value),
					"data-disabled": unref(rootContext).disabled.value ? "" : void 0,
					style: { pointerEvents: "none" },
					"as-child": _ctx.asChild,
					as: _ctx.as
				}, _ctx.$attrs), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"data-state",
					"data-disabled",
					"as-child",
					"as"
				])]),
				_: 3
			}, 8, ["present"]);
		};
	}
});

//#endregion
//#region src/Checkbox/CheckboxIndicator.vue
var CheckboxIndicator_default = CheckboxIndicator_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { CheckboxIndicator_default };
//# sourceMappingURL=CheckboxIndicator.js.map