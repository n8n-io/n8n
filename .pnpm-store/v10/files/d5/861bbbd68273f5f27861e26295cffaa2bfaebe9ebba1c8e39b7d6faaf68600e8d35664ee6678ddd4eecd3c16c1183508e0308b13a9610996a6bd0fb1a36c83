import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectSelectRootContext } from "./SelectRoot.js";
import { injectSelectContentContext } from "./SelectContentImpl.js";
import { injectSelectItemContext } from "./SelectItem.js";
import { computed, createBlock, defineComponent, mergeProps, onMounted, onUnmounted, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Select/SelectItemText.vue?vue&type=script&setup=true&lang.ts
var SelectItemText_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "SelectItemText",
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
		const rootContext = injectSelectRootContext();
		const contentContext = injectSelectContentContext();
		const itemContext = injectSelectItemContext();
		const { forwardRef, currentElement: itemTextElement } = useForwardExpose();
		const optionProps = computed(() => {
			return {
				value: itemContext.value,
				disabled: itemContext.disabled.value,
				textContent: itemTextElement.value?.textContent ?? itemContext.value?.toString() ?? ""
			};
		});
		onMounted(() => {
			if (!itemTextElement.value) return;
			itemContext.onItemTextChange(itemTextElement.value);
			contentContext.itemTextRefCallback(itemTextElement.value, itemContext.value, itemContext.disabled.value);
			rootContext.onOptionAdd(optionProps.value);
		});
		onUnmounted(() => {
			rootContext.onOptionRemove(optionProps.value);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps({
				id: unref(itemContext).textId,
				ref: unref(forwardRef)
			}, {
				...props,
				..._ctx.$attrs
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["id"]);
		};
	}
});

//#endregion
//#region src/Select/SelectItemText.vue
var SelectItemText_default = SelectItemText_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { SelectItemText_default };
//# sourceMappingURL=SelectItemText.js.map