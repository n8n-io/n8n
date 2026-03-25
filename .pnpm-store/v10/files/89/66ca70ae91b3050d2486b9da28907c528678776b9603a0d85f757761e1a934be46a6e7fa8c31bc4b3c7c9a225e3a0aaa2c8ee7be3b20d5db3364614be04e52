const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Popper_PopperRoot = require('../Popper/PopperRoot.cjs');
const require_Tooltip_TooltipProvider = require('./TooltipProvider.cjs');
const require_Tooltip_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Tooltip/TooltipRoot.vue?vue&type=script&setup=true&lang.ts
const [injectTooltipRootContext, provideTooltipRootContext] = require_shared_createContext.createContext("TooltipRoot");
var TooltipRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "TooltipRoot",
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
		delayDuration: {
			type: Number,
			required: false,
			default: void 0
		},
		disableHoverableContent: {
			type: Boolean,
			required: false,
			default: void 0
		},
		disableClosingTrigger: {
			type: Boolean,
			required: false,
			default: void 0
		},
		disabled: {
			type: Boolean,
			required: false,
			default: void 0
		},
		ignoreNonKeyboardFocus: {
			type: Boolean,
			required: false,
			default: void 0
		}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		require_shared_useForwardExpose.useForwardExpose();
		const providerContext = require_Tooltip_TooltipProvider.injectTooltipProviderContext();
		const disableHoverableContent = (0, vue.computed)(() => props.disableHoverableContent ?? providerContext.disableHoverableContent.value);
		const disableClosingTrigger = (0, vue.computed)(() => props.disableClosingTrigger ?? providerContext.disableClosingTrigger.value);
		const disableTooltip = (0, vue.computed)(() => props.disabled ?? providerContext.disabled.value);
		const delayDuration = (0, vue.computed)(() => props.delayDuration ?? providerContext.delayDuration.value);
		const ignoreNonKeyboardFocus = (0, vue.computed)(() => props.ignoreNonKeyboardFocus ?? providerContext.ignoreNonKeyboardFocus.value);
		const open = (0, __vueuse_core.useVModel)(props, "open", emit, {
			defaultValue: props.defaultOpen,
			passive: props.open === void 0
		});
		(0, vue.watch)(open, (isOpen) => {
			if (!providerContext.onClose) return;
			if (isOpen) {
				providerContext.onOpen();
				document.dispatchEvent(new CustomEvent(require_Tooltip_utils.TOOLTIP_OPEN));
			} else providerContext.onClose();
		});
		const wasOpenDelayedRef = (0, vue.ref)(false);
		const trigger = (0, vue.ref)();
		const stateAttribute = (0, vue.computed)(() => {
			if (!open.value) return "closed";
			return wasOpenDelayedRef.value ? "delayed-open" : "instant-open";
		});
		const { start: startTimer, stop: clearTimer } = (0, __vueuse_core.useTimeoutFn)(() => {
			wasOpenDelayedRef.value = true;
			open.value = true;
		}, delayDuration, { immediate: false });
		function handleOpen() {
			clearTimer();
			wasOpenDelayedRef.value = false;
			open.value = true;
		}
		function handleClose() {
			clearTimer();
			open.value = false;
		}
		function handleDelayedOpen() {
			startTimer();
		}
		provideTooltipRootContext({
			contentId: "",
			open,
			stateAttribute,
			trigger,
			onTriggerChange(el) {
				trigger.value = el;
			},
			onTriggerEnter() {
				if (providerContext.isOpenDelayed.value) handleDelayedOpen();
				else handleOpen();
			},
			onTriggerLeave() {
				if (disableHoverableContent.value) handleClose();
				else clearTimer();
			},
			onOpen: handleOpen,
			onClose: handleClose,
			disableHoverableContent,
			disableClosingTrigger,
			disabled: disableTooltip,
			ignoreNonKeyboardFocus
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
//#region src/Tooltip/TooltipRoot.vue
var TooltipRoot_default = TooltipRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TooltipRoot_default', {
  enumerable: true,
  get: function () {
    return TooltipRoot_default;
  }
});
Object.defineProperty(exports, 'injectTooltipRootContext', {
  enumerable: true,
  get: function () {
    return injectTooltipRootContext;
  }
});
//# sourceMappingURL=TooltipRoot.cjs.map