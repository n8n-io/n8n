import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useId } from "../shared/useId.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectTagsInputItemContext } from "./TagsInputItem.js";
import { createBlock, createTextVNode, defineComponent, mergeProps, openBlock, renderSlot, toDisplayString, unref, withCtx } from "vue";

//#region src/TagsInput/TagsInputItemText.vue?vue&type=script&setup=true&lang.ts
var TagsInputItemText_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "TagsInputItemText",
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
		const itemContext = injectTagsInputItemContext();
		useForwardExpose();
		itemContext.textId ||= useId(void 0, "reka-tags-input-item-text");
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, { id: unref(itemContext).textId }), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {}, () => [createTextVNode(toDisplayString(unref(itemContext).displayValue.value), 1)])]),
				_: 3
			}, 16, ["id"]);
		};
	}
});

//#endregion
//#region src/TagsInput/TagsInputItemText.vue
var TagsInputItemText_default = TagsInputItemText_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TagsInputItemText_default };
//# sourceMappingURL=TagsInputItemText.js.map