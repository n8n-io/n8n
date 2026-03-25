import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectTagsInputRootContext } from "./TagsInputRoot.js";
import { injectTagsInputItemContext } from "./TagsInputItem.js";
import { computed, createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";
import { isEqual } from "ohash";

//#region src/TagsInput/TagsInputItemDelete.vue?vue&type=script&setup=true&lang.ts
var TagsInputItemDelete_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "TagsInputItemDelete",
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
		const context = injectTagsInputRootContext();
		const itemContext = injectTagsInputItemContext();
		const disabled = computed(() => itemContext.disabled?.value || context.disabled.value);
		function handleDelete() {
			if (disabled.value) return;
			const index = context.modelValue.value.findIndex((i) => isEqual(i, itemContext.value.value));
			context.onRemoveValue(index);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps({ tabindex: "-1" }, props, {
				"aria-labelledby": unref(itemContext).textId,
				"aria-current": unref(itemContext).isSelected.value,
				"data-state": unref(itemContext).isSelected.value ? "active" : "inactive",
				"data-disabled": disabled.value ? "" : void 0,
				type: _ctx.as === "button" ? "button" : void 0,
				onClick: handleDelete
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"aria-labelledby",
				"aria-current",
				"data-state",
				"data-disabled",
				"type"
			]);
		};
	}
});

//#endregion
//#region src/TagsInput/TagsInputItemDelete.vue
var TagsInputItemDelete_default = TagsInputItemDelete_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TagsInputItemDelete_default };
//# sourceMappingURL=TagsInputItemDelete.js.map