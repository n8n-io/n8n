import { Primitive } from "../Primitive/Primitive.js";
import { injectSelectItemContext } from "./SelectItem.js";
import { createBlock, createCommentVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Select/SelectItemIndicator.vue?vue&type=script&setup=true&lang.ts
var SelectItemIndicator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "SelectItemIndicator",
	props: {
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
		const props = __props;
		const itemContext = injectSelectItemContext();
		return (_ctx, _cache) => {
			return unref(itemContext).isSelected.value ? (openBlock(), createBlock(unref(Primitive), mergeProps({
				key: 0,
				"aria-hidden": "true"
			}, props), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16)) : createCommentVNode("v-if", true);
		};
	}
});

//#endregion
//#region src/Select/SelectItemIndicator.vue
var SelectItemIndicator_default = SelectItemIndicator_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { SelectItemIndicator_default };
//# sourceMappingURL=SelectItemIndicator.js.map