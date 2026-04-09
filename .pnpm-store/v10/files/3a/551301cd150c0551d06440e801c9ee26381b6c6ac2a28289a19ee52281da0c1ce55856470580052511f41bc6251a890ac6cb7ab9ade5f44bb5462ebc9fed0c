const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useForwardPropsEmits = require('../shared/useForwardPropsEmits.cjs');
const require_Listbox_ListboxItem = require('../Listbox/ListboxItem.cjs');
const require_color_utils = require('../color/utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ColorSwatchPicker/ColorSwatchPickerItem.vue?vue&type=script&setup=true&lang.ts
const [injectColorSwatchPickerItemContext, provideColorSwatchPickerItemContext] = require_shared_createContext.createContext("ColorSwatchPickerItem", "ColorSwatchPickerItemContext");
var ColorSwatchPickerItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const { value } = (0, vue.toRefs)(props);
		const forwarded = require_shared_useForwardPropsEmits.useForwardPropsEmits(props, emits);
		const colorLabel = (0, vue.computed)(() => {
			try {
				return require_color_utils.getColorName(value.value);
			} catch {
				return value.value;
			}
		});
		provideColorSwatchPickerItemContext({ color: value });
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Listbox_ListboxItem.ListboxItem_default), (0, vue.mergeProps)((0, vue.unref)(forwarded), {
				"aria-label": colorLabel.value,
				"data-color": (0, vue.unref)(value),
				style: { "--reka-color-swatch-picker-item-color": (0, vue.unref)(value) }
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
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
Object.defineProperty(exports, 'ColorSwatchPickerItem_default', {
  enumerable: true,
  get: function () {
    return ColorSwatchPickerItem_default;
  }
});
Object.defineProperty(exports, 'injectColorSwatchPickerItemContext', {
  enumerable: true,
  get: function () {
    return injectColorSwatchPickerItemContext;
  }
});
//# sourceMappingURL=ColorSwatchPickerItem.cjs.map