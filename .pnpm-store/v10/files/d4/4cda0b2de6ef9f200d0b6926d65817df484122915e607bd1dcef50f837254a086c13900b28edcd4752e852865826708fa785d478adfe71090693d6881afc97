import { createContext } from "../shared/createContext.js";
import { useForwardPropsEmits } from "../shared/useForwardPropsEmits.js";
import { ListboxItem_default } from "../Listbox/ListboxItem.js";
import { getColorName } from "../color/utils.js";
import { computed, createBlock, defineComponent, mergeProps, openBlock, renderSlot, toRefs, unref, withCtx } from "vue";

//#region src/ColorSwatchPicker/ColorSwatchPickerItem.vue?vue&type=script&setup=true&lang.ts
const [injectColorSwatchPickerItemContext, provideColorSwatchPickerItemContext] = createContext("ColorSwatchPickerItem", "ColorSwatchPickerItemContext");
var ColorSwatchPickerItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ColorSwatchPickerItem",
	props: {
		value: {
			type: String,
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
		const { value } = toRefs(props);
		const forwarded = useForwardPropsEmits(props, emits);
		const colorLabel = computed(() => {
			try {
				return getColorName(value.value);
			} catch {
				return value.value;
			}
		});
		provideColorSwatchPickerItemContext({ color: value });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ListboxItem_default), mergeProps(unref(forwarded), {
				"aria-label": colorLabel.value,
				"data-color": unref(value),
				style: { "--reka-color-swatch-picker-item-color": unref(value) }
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"aria-label",
				"data-color",
				"style"
			]);
		};
	}
});

//#endregion
//#region src/ColorSwatchPicker/ColorSwatchPickerItem.vue
var ColorSwatchPickerItem_default = ColorSwatchPickerItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ColorSwatchPickerItem_default, injectColorSwatchPickerItemContext };
//# sourceMappingURL=ColorSwatchPickerItem.js.map