const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_Popper_PopperRoot = require('../Popper/PopperRoot.cjs');
const require_shared_useIsUsingKeyboard = require('../shared/useIsUsingKeyboard.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Menu/MenuRoot.vue?vue&type=script&setup=true&lang.ts
const [injectMenuContext, provideMenuContext] = require_shared_createContext.createContext(["MenuRoot", "MenuSub"], "MenuContext");
const [injectMenuRootContext, provideMenuRootContext] = require_shared_createContext.createContext("MenuRoot");
var MenuRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "MenuRoot",
	props: {
		open: {
			type: Boolean,
			required: false,
			default: false
		},
		dir: {
			type: String,
			required: false
		},
		modal: {
			type: Boolean,
			required: false,
			default: true
		}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { modal, dir: propDir } = (0, vue.toRefs)(props);
		const dir = require_shared_useDirection.useDirection(propDir);
		const open = (0, __vueuse_core.useVModel)(props, "open", emits);
		const content = (0, vue.ref)();
		const isUsingKeyboardRef = require_shared_useIsUsingKeyboard.useIsUsingKeyboard();
		provideMenuContext({
			open,
			onOpenChange: (value) => {
				open.value = value;
			},
			content,
			onContentChange: (element) => {
				content.value = element;
			}
		});
		provideMenuRootContext({
			onClose: () => {
				open.value = false;
			},
			isUsingKeyboardRef,
			dir,
			modal
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
//#region src/Menu/MenuRoot.vue
var MenuRoot_default = MenuRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MenuRoot_default', {
  enumerable: true,
  get: function () {
    return MenuRoot_default;
  }
});
Object.defineProperty(exports, 'injectMenuContext', {
  enumerable: true,
  get: function () {
    return injectMenuContext;
  }
});
Object.defineProperty(exports, 'injectMenuRootContext', {
  enumerable: true,
  get: function () {
    return injectMenuRootContext;
  }
});
Object.defineProperty(exports, 'provideMenuContext', {
  enumerable: true,
  get: function () {
    return provideMenuContext;
  }
});
//# sourceMappingURL=MenuRoot.cjs.map