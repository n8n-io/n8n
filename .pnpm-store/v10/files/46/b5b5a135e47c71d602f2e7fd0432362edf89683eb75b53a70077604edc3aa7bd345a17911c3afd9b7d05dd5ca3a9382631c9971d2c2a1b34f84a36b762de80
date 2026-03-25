import { ListboxVirtualizer_default } from "../Listbox/ListboxVirtualizer.js";
import { injectComboboxRootContext } from "./ComboboxRoot.js";
import { createBlock, defineComponent, guardReactiveProps, normalizeProps, openBlock, renderSlot, withCtx } from "vue";

//#region src/Combobox/ComboboxVirtualizer.vue?vue&type=script&setup=true&lang.ts
var ComboboxVirtualizer_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ComboboxVirtualizer",
	props: {
		options: {
			type: Array,
			required: true
		},
		overscan: {
			type: Number,
			required: false
		},
		estimateSize: {
			type: Number,
			required: false
		},
		textContent: {
			type: Function,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectComboboxRootContext();
		rootContext.isVirtual.value = true;
		return (_ctx, _cache) => {
			return openBlock(), createBlock(ListboxVirtualizer_default, normalizeProps(guardReactiveProps(props)), {
				default: withCtx((slotProps) => [renderSlot(_ctx.$slots, "default", normalizeProps(guardReactiveProps(slotProps)))]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxVirtualizer.vue
var ComboboxVirtualizer_default = ComboboxVirtualizer_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ComboboxVirtualizer_default };
//# sourceMappingURL=ComboboxVirtualizer.js.map