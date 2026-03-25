const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Dialog/DialogRoot.vue?vue&type=script&setup=true&lang.ts
const [injectDialogRootContext, provideDialogRootContext] = require_shared_createContext.createContext("DialogRoot");
var DialogRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "DialogRoot",
	props: {
		open: {
			type: Boolean,
			required: false,
			default: void 0
		},
		defaultOpen: {
			type: Boolean,
			required: false,
			default: false
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
		const open = (0, __vueuse_core.useVModel)(props, "open", emit, {
			defaultValue: props.defaultOpen,
			passive: props.open === void 0
		});
		const triggerElement = (0, vue.ref)();
		const contentElement = (0, vue.ref)();
		const { modal } = (0, vue.toRefs)(props);
		provideDialogRootContext({
			open,
			modal,
			openModal: () => {
				open.value = true;
			},
			onOpenChange: (value) => {
				open.value = value;
			},
			onOpenToggle: () => {
				open.value = !open.value;
			},
			contentId: "",
			titleId: "",
			descriptionId: "",
			triggerElement,
			contentElement
		});
		return (_ctx, _cache) => {
			return (0, vue.renderSlot)(_ctx.$slots, "default", {
				open: (0, vue.unref)(open),
				close: () => open.value = false
			});
		};
	}
});

//#endregion
//#region src/Dialog/DialogRoot.vue
var DialogRoot_default = DialogRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DialogRoot_default', {
  enumerable: true,
  get: function () {
    return DialogRoot_default;
  }
});
Object.defineProperty(exports, 'injectDialogRootContext', {
  enumerable: true,
  get: function () {
    return injectDialogRootContext;
  }
});
//# sourceMappingURL=DialogRoot.cjs.map