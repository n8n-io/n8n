const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Menu_utils = require('./utils.cjs');
const require_Menu_MenuItem = require('./MenuItem.cjs');
const require_Menu_MenuItemIndicator = require('./MenuItemIndicator.cjs');
const require_Menu_MenuRadioGroup = require('./MenuRadioGroup.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Menu/MenuRadioItem.vue?vue&type=script&setup=true&lang.ts
var MenuRadioItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const { value } = (0, vue.toRefs)(props);
		const radioGroupContext = require_Menu_MenuRadioGroup.injectMenuRadioGroupContext();
		const modelValue = (0, vue.computed)(() => radioGroupContext.modelValue.value === value?.value);
		require_Menu_MenuItemIndicator.provideMenuItemIndicatorContext({ modelValue });
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)(require_Menu_MenuItem.MenuItem_default, (0, vue.mergeProps)({ role: "menuitemradio" }, props, {
				"aria-checked": modelValue.value,
				"data-state": (0, vue.unref)(require_Menu_utils.getCheckedState)(modelValue.value),
				onSelect: _cache[0] || (_cache[0] = async (event) => {
					emits("select", event);
					(0, vue.unref)(radioGroupContext).onValueChange((0, vue.unref)(value));
				})
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["aria-checked", "data-state"]);
		};
	}
});

//#endregion
//#region src/Menu/MenuRadioItem.vue
var MenuRadioItem_default = MenuRadioItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MenuRadioItem_default', {
  enumerable: true,
  get: function () {
    return MenuRadioItem_default;
  }
});
//# sourceMappingURL=MenuRadioItem.cjs.map