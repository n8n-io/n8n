const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Menu_MenuRoot = require('../Menu/MenuRoot.cjs');
const require_Menubar_MenubarRoot = require('./MenubarRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Menubar/MenubarMenu.vue?vue&type=script&setup=true&lang.ts
const [injectMenubarMenuContext, provideMenubarMenuContext] = require_shared_createContext.createContext("MenubarMenu");
var MenubarMenu_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "MenubarMenu",
	props: { value: {
		type: String,
		required: false
	} },
	setup(__props) {
		const props = __props;
		const value = require_shared_useId.useId(props.value);
		const rootContext = require_Menubar_MenubarRoot.injectMenubarRootContext();
		require_shared_useForwardExpose.useForwardExpose();
		const triggerElement = (0, vue.ref)();
		const wasKeyboardTriggerOpenRef = (0, vue.ref)(false);
		const open = (0, vue.computed)(() => rootContext.modelValue.value === value);
		(0, vue.watch)(open, () => {
			if (!open.value) wasKeyboardTriggerOpenRef.value = false;
		});
		provideMenubarMenuContext({
			value,
			triggerElement,
			triggerId: value,
			contentId: "",
			wasKeyboardTriggerOpenRef
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Menu_MenuRoot.MenuRoot_default), {
				open: open.value,
				modal: false,
				dir: (0, vue.unref)(rootContext).dir.value,
				"onUpdate:open": _cache[0] || (_cache[0] = (value$1) => {
					if (!value$1) (0, vue.unref)(rootContext).onMenuClose();
				})
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["open", "dir"]);
		};
	}
});

//#endregion
//#region src/Menubar/MenubarMenu.vue
var MenubarMenu_default = MenubarMenu_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MenubarMenu_default', {
  enumerable: true,
  get: function () {
    return MenubarMenu_default;
  }
});
Object.defineProperty(exports, 'injectMenubarMenuContext', {
  enumerable: true,
  get: function () {
    return injectMenubarMenuContext;
  }
});
//# sourceMappingURL=MenubarMenu.cjs.map