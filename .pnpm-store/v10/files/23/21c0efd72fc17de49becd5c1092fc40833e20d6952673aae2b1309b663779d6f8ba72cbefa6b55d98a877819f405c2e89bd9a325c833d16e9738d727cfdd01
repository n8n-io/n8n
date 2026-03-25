const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Popper_PopperRoot = require('../Popper/PopperRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/HoverCard/HoverCardRoot.vue?vue&type=script&setup=true&lang.ts
const [injectHoverCardRootContext, provideHoverCardRootContext] = require_shared_createContext.createContext("HoverCardRoot");
var HoverCardRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "HoverCardRoot",
	props: {
		defaultOpen: {
			type: Boolean,
			required: false,
			default: false
		},
		open: {
			type: Boolean,
			required: false,
			default: void 0
		},
		openDelay: {
			type: Number,
			required: false,
			default: 700
		},
		closeDelay: {
			type: Number,
			required: false,
			default: 300
		}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const { openDelay, closeDelay } = (0, vue.toRefs)(props);
		require_shared_useForwardExpose.useForwardExpose();
		const open = (0, __vueuse_core.useVModel)(props, "open", emit, {
			defaultValue: props.defaultOpen,
			passive: props.open === void 0
		});
		const openTimerRef = (0, vue.ref)(0);
		const closeTimerRef = (0, vue.ref)(0);
		const hasSelectionRef = (0, vue.ref)(false);
		const isPointerDownOnContentRef = (0, vue.ref)(false);
		const isPointerInTransitRef = (0, vue.ref)(false);
		const triggerElement = (0, vue.ref)();
		function handleOpen() {
			clearTimeout(closeTimerRef.value);
			openTimerRef.value = window.setTimeout(() => open.value = true, openDelay.value);
		}
		function handleClose() {
			clearTimeout(openTimerRef.value);
			if (!hasSelectionRef.value && !isPointerDownOnContentRef.value) closeTimerRef.value = window.setTimeout(() => open.value = false, closeDelay.value);
		}
		function handleDismiss() {
			open.value = false;
		}
		provideHoverCardRootContext({
			open,
			onOpenChange(value) {
				open.value = value;
			},
			onOpen: handleOpen,
			onClose: handleClose,
			onDismiss: handleDismiss,
			hasSelectionRef,
			isPointerDownOnContentRef,
			isPointerInTransitRef,
			triggerElement
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Popper_PopperRoot.PopperRoot_default), null, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { open: (0, vue.unref)(open) })]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/HoverCard/HoverCardRoot.vue
var HoverCardRoot_default = HoverCardRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'HoverCardRoot_default', {
  enumerable: true,
  get: function () {
    return HoverCardRoot_default;
  }
});
Object.defineProperty(exports, 'injectHoverCardRootContext', {
  enumerable: true,
  get: function () {
    return injectHoverCardRootContext;
  }
});
//# sourceMappingURL=HoverCardRoot.cjs.map