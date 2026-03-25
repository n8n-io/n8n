import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectListboxItemContext } from "./ListboxItem.js";
import { createBlock, createCommentVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Listbox/ListboxItemIndicator.vue?vue&type=script&setup=true&lang.ts
var ListboxItemIndicator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ListboxItemIndicator",
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
		useForwardExpose();
		const itemContext = injectListboxItemContext();
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
//#region src/Listbox/ListboxItemIndicator.vue
var ListboxItemIndicator_default = ListboxItemIndicator_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ListboxItemIndicator_default };
//# sourceMappingURL=ListboxItemIndicator.js.map