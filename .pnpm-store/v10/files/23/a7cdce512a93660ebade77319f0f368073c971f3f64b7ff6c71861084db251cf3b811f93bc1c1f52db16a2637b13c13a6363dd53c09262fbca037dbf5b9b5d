const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_Popper_PopperRoot = require('../Popper/PopperRoot.cjs');
const require_Menu_MenuRoot = require('./MenuRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Menu/MenuSub.vue?vue&type=script&setup=true&lang.ts
const [injectMenuSubContext, provideMenuSubContext] = require_shared_createContext.createContext("MenuSub");
var MenuSub_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "MenuSub",
	props: { open: {
		type: Boolean,
		required: false,
		default: void 0
	} },
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const open = (0, __vueuse_core.useVModel)(props, "open", emits, {
			defaultValue: false,
			passive: props.open === void 0
		});
		const parentMenuContext = require_Menu_MenuRoot.injectMenuContext();
		const trigger = (0, vue.ref)();
		const content = (0, vue.ref)();
		(0, vue.watchEffect)((cleanupFn) => {
			if (parentMenuContext?.open.value === false) open.value = false;
			cleanupFn(() => open.value = false);
		});
		require_Menu_MenuRoot.provideMenuContext({
			open,
			onOpenChange: (value) => {
				open.value = value;
			},
			content,
			onContentChange: (element) => {
				content.value = element;
			}
		});
		provideMenuSubContext({
			triggerId: "",
			contentId: "",
			trigger,
			onTriggerChange: (element) => {
				trigger.value = element;
			}
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Popper_PopperRoot.PopperRoot_default), null, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Menu/MenuSub.vue
var MenuSub_default = MenuSub_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MenuSub_default', {
  enumerable: true,
  get: function () {
    return MenuSub_default;
  }
});
Object.defineProperty(exports, 'injectMenuSubContext', {
  enumerable: true,
  get: function () {
    return injectMenuSubContext;
  }
});
//# sourceMappingURL=MenuSub.cjs.map