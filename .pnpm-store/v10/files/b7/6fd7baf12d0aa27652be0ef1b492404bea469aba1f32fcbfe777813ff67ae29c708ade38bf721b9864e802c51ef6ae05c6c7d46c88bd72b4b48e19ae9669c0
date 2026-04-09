import { ColorSwatch_default } from "../ColorSwatch/ColorSwatch.js";
import { injectColorSwatchPickerItemContext } from "./ColorSwatchPickerItem.js";
import { createBlock, defineComponent, mergeProps, openBlock, unref } from "vue";

//#region src/ColorSwatchPicker/ColorSwatchPickerItemSwatch.vue?vue&type=script&setup=true&lang.ts
var ColorSwatchPickerItemSwatch_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ColorSwatchPickerItemSwatch",
	props: {
		label: {
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
	setup(__props) {
		const props = __props;
		const colorSwatchPickerItemContext = injectColorSwatchPickerItemContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ColorSwatch_default), mergeProps(props, { color: unref(colorSwatchPickerItemContext).color.value }), null, 16, ["color"]);
		};
	}
});

//#endregion
//#region src/ColorSwatchPicker/ColorSwatchPickerItemSwatch.vue
var ColorSwatchPickerItemSwatch_default = ColorSwatchPickerItemSwatch_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ColorSwatchPickerItemSwatch_default };
//# sourceMappingURL=ColorSwatchPickerItemSwatch.js.map