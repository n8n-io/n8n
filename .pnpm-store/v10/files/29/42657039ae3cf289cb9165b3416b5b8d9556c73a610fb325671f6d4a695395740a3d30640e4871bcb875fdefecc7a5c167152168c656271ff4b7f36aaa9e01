import { createContext } from "../shared/createContext.js";
import { useId } from "../shared/useId.js";
import { ListboxGroup_default } from "../Listbox/ListboxGroup.js";
import { injectComboboxRootContext } from "./ComboboxRoot.js";
import { computed, createBlock, defineComponent, mergeProps, onMounted, onUnmounted, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Combobox/ComboboxGroup.vue?vue&type=script&setup=true&lang.ts
const [injectComboboxGroupContext, provideComboboxGroupContext] = createContext("ComboboxGroup");
var ComboboxGroup_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ComboboxGroup",
	props: {
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
		const id = useId(void 0, "reka-combobox-group");
		const rootContext = injectComboboxRootContext();
		const isRender = computed(() => rootContext.ignoreFilter.value ? true : !rootContext.filterSearch.value ? true : rootContext.filterState.value.groups.has(id));
		const context = provideComboboxGroupContext({
			id,
			labelId: ""
		});
		onMounted(() => {
			if (!rootContext.allGroups.value.has(id)) rootContext.allGroups.value.set(id, /* @__PURE__ */ new Set());
		});
		onUnmounted(() => {
			rootContext.allGroups.value.delete(id);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ListboxGroup_default), mergeProps({
				id: unref(id),
				"aria-labelledby": unref(context).labelId
			}, props, { hidden: isRender.value ? void 0 : true }), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"id",
				"aria-labelledby",
				"hidden"
			]);
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxGroup.vue
var ComboboxGroup_default = ComboboxGroup_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ComboboxGroup_default, injectComboboxGroupContext };
//# sourceMappingURL=ComboboxGroup.js.map