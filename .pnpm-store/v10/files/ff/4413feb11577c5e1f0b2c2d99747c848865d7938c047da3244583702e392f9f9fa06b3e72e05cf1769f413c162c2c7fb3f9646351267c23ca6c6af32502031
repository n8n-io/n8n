const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Menu_MenuRoot = require('../Menu/MenuRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/DropdownMenu/DropdownMenuRoot.vue?vue&type=script&setup=true&lang.ts
const [injectDropdownMenuRootContext, provideDropdownMenuRootContext] = require_shared_createContext.createContext("DropdownMenuRoot");
var DropdownMenuRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DropdownMenuRoot",
	props: {
		defaultOpen: {
			type: Boolean,
			required: false
		},
		open: {
			type: Boolean,
			required: false,
			default: void 0
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
		const emit = __emit;
		require_shared_useForwardExpose.useForwardExpose();
		const open = (0, __vueuse_core.useVModel)(props, "open", emit, {
			defaultValue: props.defaultOpen,
			passive: props.open === void 0
		});
		const triggerElement = (0, vue.ref)();
		const { modal, dir: propDir } = (0, vue.toRefs)(props);
		const dir = require_shared_useDirection.useDirection(propDir);
		provideDropdownMenuRootContext({
			open,
			onOpenChange: (value) => {
				open.value = value;
			},
			onOpenToggle: () => {
				open.value = !open.value;
			},
			triggerId: "",
			triggerElement,
			contentId: "",
			modal,
			dir
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Menu_MenuRoot.MenuRoot_default), {
				open: (0, vue.unref)(open),
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => (0, vue.isRef)(open) ? open.value = $event : null),
				dir: (0, vue.unref)(dir),
				modal: (0, vue.unref)(modal)
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { open: (0, vue.unref)(open) })]),
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
//#region src/DropdownMenu/DropdownMenuRoot.vue
var DropdownMenuRoot_default = DropdownMenuRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DropdownMenuRoot_default', {
  enumerable: true,
  get: function () {
    return DropdownMenuRoot_default;
  }
});
Object.defineProperty(exports, 'injectDropdownMenuRootContext', {
  enumerable: true,
  get: function () {
    return injectDropdownMenuRootContext;
  }
});
//# sourceMappingURL=DropdownMenuRoot.cjs.map