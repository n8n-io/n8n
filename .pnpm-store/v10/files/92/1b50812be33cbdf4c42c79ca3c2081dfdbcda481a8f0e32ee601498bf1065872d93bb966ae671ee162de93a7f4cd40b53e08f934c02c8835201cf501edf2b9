const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Menu_MenuRoot = require('../Menu/MenuRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ContextMenu/ContextMenuRoot.vue?vue&type=script&setup=true&lang.ts
const [injectContextMenuRootContext, provideContextMenuRootContext] = require_shared_createContext.createContext("ContextMenuRoot");
var ContextMenuRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "ContextMenuRoot",
	props: {
		pressOpenDelay: {
			type: Number,
			required: false,
			default: 700
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
		const { dir: propDir, modal, pressOpenDelay } = (0, vue.toRefs)(props);
		require_shared_useForwardExpose.useForwardExpose();
		const dir = require_shared_useDirection.useDirection(propDir);
		const open = (0, vue.ref)(false);
		const triggerElement = (0, vue.ref)();
		provideContextMenuRootContext({
			open,
			onOpenChange: (value) => {
				open.value = value;
			},
			dir,
			modal,
			triggerElement,
			pressOpenDelay
		});
		(0, vue.watch)(open, (value) => {
			emits("update:open", value);
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Menu_MenuRoot.MenuRoot_default), {
				open: open.value,
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => open.value = $event),
				dir: (0, vue.unref)(dir),
				modal: (0, vue.unref)(modal)
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"open",
				"dir",
				"modal"
			]);
		};
	}
});

//#endregion
//#region src/ContextMenu/ContextMenuRoot.vue
var ContextMenuRoot_default = ContextMenuRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ContextMenuRoot_default', {
  enumerable: true,
  get: function () {
    return ContextMenuRoot_default;
  }
});
Object.defineProperty(exports, 'injectContextMenuRootContext', {
  enumerable: true,
  get: function () {
    return injectContextMenuRootContext;
  }
});
//# sourceMappingURL=ContextMenuRoot.cjs.map