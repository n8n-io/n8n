const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Menu_utils = require('./utils.cjs');
const require_Menu_MenuItem = require('./MenuItem.cjs');
const require_Menu_MenuItemIndicator = require('./MenuItemIndicator.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Menu/MenuCheckboxItem.vue?vue&type=script&setup=true&lang.ts
var MenuCheckboxItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits);
		require_Menu_MenuItemIndicator.provideMenuItemIndicatorContext({ modelValue });
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)(require_Menu_MenuItem.MenuItem_default, (0, vue.mergeProps)({ role: "menuitemcheckbox" }, props, {
				"aria-checked": (0, vue.unref)(require_Menu_utils.isIndeterminate)((0, vue.unref)(modelValue)) ? "mixed" : (0, vue.unref)(modelValue),
				"data-state": (0, vue.unref)(require_Menu_utils.getCheckedState)((0, vue.unref)(modelValue)),
				onSelect: _cache[0] || (_cache[0] = async (event) => {
					emits("select", event);
					if ((0, vue.unref)(require_Menu_utils.isIndeterminate)((0, vue.unref)(modelValue))) modelValue.value = true;
					else modelValue.value = !(0, vue.unref)(modelValue);
				})
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue.unref)(modelValue) })]),
				_: 3
			}, 16, ["aria-checked", "data-state"]);
		};
	}
});

//#endregion
//#region src/Menu/MenuCheckboxItem.vue
var MenuCheckboxItem_default = MenuCheckboxItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MenuCheckboxItem_default', {
  enumerable: true,
  get: function () {
    return MenuCheckboxItem_default;
  }
});
//# sourceMappingURL=MenuCheckboxItem.cjs.map