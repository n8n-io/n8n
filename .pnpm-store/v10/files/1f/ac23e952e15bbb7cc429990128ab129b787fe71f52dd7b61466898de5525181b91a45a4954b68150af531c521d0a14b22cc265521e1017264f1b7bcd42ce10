import { createContext } from "../shared/createContext.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useCollection } from "../Collection/Collection.js";
import { injectTagsInputRootContext } from "./TagsInputRoot.js";
import { computed, createBlock, createVNode, defineComponent, openBlock, renderSlot, toRefs, unref, withCtx } from "vue";

//#region src/TagsInput/TagsInputItem.vue?vue&type=script&setup=true&lang.ts
const [injectTagsInputItemContext, provideTagsInputItemContext] = createContext("TagsInputItem");
var TagsInputItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "TagsInputItem",
	props: {
		value: {
			type: [String, Object],
			required: true
		},
		disabled: {
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
		const { value } = toRefs(props);
		const context = injectTagsInputRootContext();
		const { forwardRef, currentElement } = useForwardExpose();
		const { CollectionItem } = useCollection();
		const isSelected = computed(() => context.selectedElement.value === currentElement.value);
		const disabled = computed(() => props.disabled || context.disabled.value);
		const itemContext = provideTagsInputItemContext({
			value,
			isSelected,
			disabled,
			textId: "",
			displayValue: computed(() => context.displayValue(value.value))
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(CollectionItem), { value: unref(value) }, {
				default: withCtx(() => [createVNode(unref(Primitive), {
					ref: unref(forwardRef),
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"aria-labelledby": unref(itemContext).textId,
					"aria-current": isSelected.value,
					"data-disabled": disabled.value ? "" : void 0,
					"data-state": isSelected.value ? "active" : "inactive"
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"as",
					"as-child",
					"aria-labelledby",
					"aria-current",
					"data-disabled",
					"data-state"
				])]),
				_: 3
			}, 8, ["value"]);
		};
	}
});

//#endregion
//#region src/TagsInput/TagsInputItem.vue
var TagsInputItem_default = TagsInputItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TagsInputItem_default, injectTagsInputItemContext };
//# sourceMappingURL=TagsInputItem.js.map