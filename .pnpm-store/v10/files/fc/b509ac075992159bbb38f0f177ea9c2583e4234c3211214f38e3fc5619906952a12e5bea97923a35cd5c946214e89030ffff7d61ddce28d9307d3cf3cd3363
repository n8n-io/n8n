import { getCheckedState, isIndeterminate } from "./utils.js";
import { MenuItem_default } from "./MenuItem.js";
import { provideMenuItemIndicatorContext } from "./MenuItemIndicator.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/Menu/MenuCheckboxItem.vue?vue&type=script&setup=true&lang.ts
var MenuCheckboxItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MenuCheckboxItem",
	props: {
		modelValue: {
			type: [Boolean, String],
			required: false,
			default: false
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
	emits: ["select", "update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const modelValue = useVModel(props, "modelValue", emits);
		provideMenuItemIndicatorContext({ modelValue });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(MenuItem_default, mergeProps({ role: "menuitemcheckbox" }, props, {
				"aria-checked": unref(isIndeterminate)(unref(modelValue)) ? "mixed" : unref(modelValue),
				"data-state": unref(getCheckedState)(unref(modelValue)),
				onSelect: _cache[0] || (_cache[0] = async (event) => {
					emits("select", event);
					if (unref(isIndeterminate)(unref(modelValue))) modelValue.value = true;
					else modelValue.value = !unref(modelValue);
				})
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { modelValue: unref(modelValue) })]),
				_: 3
			}, 16, ["aria-checked", "data-state"]);
		};
	}
});

//#endregion
//#region src/Menu/MenuCheckboxItem.vue
var MenuCheckboxItem_default = MenuCheckboxItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MenuCheckboxItem_default };
//# sourceMappingURL=MenuCheckboxItem.js.map