import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Presence_default } from "../Presence/Presence.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectRadioGroupItemContext } from "./RadioGroupItem.js";
import { createBlock, createVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/RadioGroup/RadioGroupIndicator.vue?vue&type=script&setup=true&lang.ts
var RadioGroupIndicator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "RadioGroupIndicator",
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
		const itemContext = injectRadioGroupItemContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Presence_default), { present: _ctx.forceMount || unref(itemContext).checked.value }, {
				default: withCtx(() => [createVNode(unref(Primitive), mergeProps({
					ref: unref(forwardRef),
					"data-state": unref(itemContext).checked.value ? "checked" : "unchecked",
					"data-disabled": unref(itemContext).disabled.value ? "" : void 0,
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
//#region src/RadioGroup/RadioGroupIndicator.vue
var RadioGroupIndicator_default = RadioGroupIndicator_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { RadioGroupIndicator_default };
//# sourceMappingURL=RadioGroupIndicator.js.map