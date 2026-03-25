import { getCheckedState } from "./utils.js";
import { MenuItem_default } from "./MenuItem.js";
import { provideMenuItemIndicatorContext } from "./MenuItemIndicator.js";
import { injectMenuRadioGroupContext } from "./MenuRadioGroup.js";
import { computed, createBlock, defineComponent, mergeProps, openBlock, renderSlot, toRefs, unref, withCtx } from "vue";

//#region src/Menu/MenuRadioItem.vue?vue&type=script&setup=true&lang.ts
var MenuRadioItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MenuRadioItem",
	props: {
		value: {
			type: String,
			required: true
		},
		disabled: {
			type: Boolean,
			required: false
		},
		textValue: {
			type: String,
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
		const { value } = toRefs(props);
		const radioGroupContext = injectMenuRadioGroupContext();
		const modelValue = computed(() => radioGroupContext.modelValue.value === value?.value);
		provideMenuItemIndicatorContext({ modelValue });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(MenuItem_default, mergeProps({ role: "menuitemradio" }, props, {
				"aria-checked": modelValue.value,
				"data-state": unref(getCheckedState)(modelValue.value),
				onSelect: _cache[0] || (_cache[0] = async (event) => {
					emits("select", event);
					unref(radioGroupContext).onValueChange(unref(value));
				})
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["aria-checked", "data-state"]);
		};
	}
});

//#endregion
//#region src/Menu/MenuRadioItem.vue
var MenuRadioItem_default = MenuRadioItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MenuRadioItem_default };
//# sourceMappingURL=MenuRadioItem.js.map