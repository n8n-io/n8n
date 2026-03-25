import { useId } from "../shared/useId.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { ListboxItem_default } from "../Listbox/ListboxItem.js";
import { injectComboboxRootContext } from "./ComboboxRoot.js";
import { injectComboboxGroupContext } from "./ComboboxGroup.js";
import { computed, createBlock, createCommentVNode, createTextVNode, defineComponent, mergeProps, onMounted, onUnmounted, openBlock, renderSlot, toDisplayString, unref, withCtx } from "vue";

//#region src/Combobox/ComboboxItem.vue?vue&type=script&setup=true&lang.ts
var ComboboxItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ComboboxItem",
	props: {
		textValue: {
			type: String,
			required: false
		},
		value: {
			type: null,
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
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const id = useId(void 0, "reka-combobox-item");
		const rootContext = injectComboboxRootContext();
		const groupContext = injectComboboxGroupContext(null);
		const { primitiveElement, currentElement } = usePrimitiveElement();
		if (props.value === "") throw new Error("A <ComboboxItem /> must have a value prop that is not an empty string. This is because the Combobox value can be set to an empty string to clear the selection and show the placeholder.");
		const isRender = computed(() => {
			if (rootContext.isVirtual.value || rootContext.ignoreFilter.value || !rootContext.filterSearch.value) return true;
			else {
				const filteredCurrentItem = rootContext.filterState.value.items.get(id);
				if (filteredCurrentItem === void 0) return true;
				return filteredCurrentItem > 0;
			}
		});
		onMounted(() => {
			rootContext.allItems.value.set(id, props.textValue || currentElement.value.textContent || currentElement.value.innerText);
			const groupId = groupContext?.id;
			if (groupId) if (!rootContext.allGroups.value.has(groupId)) rootContext.allGroups.value.set(groupId, new Set([id]));
			else rootContext.allGroups.value.get(groupId)?.add(id);
		});
		onUnmounted(() => {
			rootContext.allItems.value.delete(id);
		});
		return (_ctx, _cache) => {
			return isRender.value ? (openBlock(), createBlock(unref(ListboxItem_default), mergeProps({ key: 0 }, props, {
				id: unref(id),
				ref_key: "primitiveElement",
				ref: primitiveElement,
				disabled: unref(rootContext).disabled.value || _ctx.disabled,
				onSelect: _cache[0] || (_cache[0] = (event) => {
					emits("select", event);
					if (event.defaultPrevented) return;
					if (!unref(rootContext).multiple.value && !_ctx.disabled && !unref(rootContext).disabled.value) {
						event.preventDefault();
						unref(rootContext).onOpenChange(false);
						unref(rootContext).modelValue.value = props.value;
					}
				})
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {}, () => [createTextVNode(toDisplayString(_ctx.value), 1)])]),
				_: 3
			}, 16, ["id", "disabled"])) : createCommentVNode("v-if", true);
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxItem.vue
var ComboboxItem_default = ComboboxItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ComboboxItem_default };
//# sourceMappingURL=ComboboxItem.js.map