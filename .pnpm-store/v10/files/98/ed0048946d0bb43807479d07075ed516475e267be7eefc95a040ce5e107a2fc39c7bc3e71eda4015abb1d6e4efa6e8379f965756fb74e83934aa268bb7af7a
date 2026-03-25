const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_Presence_Presence = require('../Presence/Presence.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Menu_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Menu/MenuItemIndicator.vue?vue&type=script&setup=true&lang.ts
const [injectMenuItemIndicatorContext, provideMenuItemIndicatorContext] = require_shared_createContext.createContext(["MenuCheckboxItem", "MenuRadioItem"], "MenuItemIndicatorContext");
var MenuItemIndicator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "MenuItemIndicator",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "span"
		}
	},
	setup(__props) {
		const indicatorContext = injectMenuItemIndicatorContext({ modelValue: (0, vue.ref)(false) });
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Presence_Presence.Presence_default), { present: _ctx.forceMount || (0, vue.unref)(require_Menu_utils.isIndeterminate)((0, vue.unref)(indicatorContext).modelValue.value) || (0, vue.unref)(indicatorContext).modelValue.value === true }, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"data-state": (0, vue.unref)(require_Menu_utils.getCheckedState)((0, vue.unref)(indicatorContext).modelValue.value)
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"as",
					"as-child",
					"data-state"
				])]),
				_: 3
			}, 8, ["present"]);
		};
	}
});

//#endregion
//#region src/Menu/MenuItemIndicator.vue
var MenuItemIndicator_default = MenuItemIndicator_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MenuItemIndicator_default', {
  enumerable: true,
  get: function () {
    return MenuItemIndicator_default;
  }
});
Object.defineProperty(exports, 'provideMenuItemIndicatorContext', {
  enumerable: true,
  get: function () {
    return provideMenuItemIndicatorContext;
  }
});
//# sourceMappingURL=MenuItemIndicator.cjs.map