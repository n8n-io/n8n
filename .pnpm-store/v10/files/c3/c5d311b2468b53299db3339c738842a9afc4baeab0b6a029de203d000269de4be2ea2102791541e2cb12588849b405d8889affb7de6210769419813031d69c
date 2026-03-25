import { Primitive } from "../Primitive/Primitive.js";
import { injectComboboxRootContext } from "./ComboboxRoot.js";
import { computed, createBlock, createCommentVNode, createTextVNode, defineComponent, guardReactiveProps, mergeProps, normalizeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Combobox/ComboboxEmpty.vue?vue&type=script&setup=true&lang.ts
var ComboboxEmpty_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ComboboxEmpty",
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
		const rootContext = injectComboboxRootContext();
		const isRender = computed(() => rootContext.ignoreFilter.value ? rootContext.allItems.value.size === 0 : rootContext.filterState.value.count === 0);
		return (_ctx, _cache) => {
			return isRender.value ? (openBlock(), createBlock(unref(Primitive), normalizeProps(mergeProps({ key: 0 }, props)), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {}, () => [_cache[0] || (_cache[0] = createTextVNode("No options"))])]),
				_: 3
			}, 16)) : createCommentVNode("v-if", true);
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxEmpty.vue
var ComboboxEmpty_default = ComboboxEmpty_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ComboboxEmpty_default };
//# sourceMappingURL=ComboboxEmpty.js.map