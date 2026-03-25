const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_shared = require_rolldown_runtime.__toESM(require("@vueuse/shared"));

//#region src/Tooltip/TooltipProvider.vue?vue&type=script&setup=true&lang.ts
const [injectTooltipProviderContext, provideTooltipProviderContext] = require_shared_createContext.createContext("TooltipProvider");
var TooltipProvider_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "TooltipProvider",
	props: {
		delayDuration: {
			type: Number,
			required: false,
			default: 700
		},
		skipDelayDuration: {
			type: Number,
			required: false,
			default: 300
		},
		disableHoverableContent: {
			type: Boolean,
			required: false,
			default: false
		},
		disableClosingTrigger: {
			type: Boolean,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		ignoreNonKeyboardFocus: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	setup(__props) {
		const props = __props;
		const { delayDuration, skipDelayDuration, disableHoverableContent, disableClosingTrigger, ignoreNonKeyboardFocus, disabled } = (0, vue.toRefs)(props);
		require_shared_useForwardExpose.useForwardExpose();
		const isOpenDelayed = (0, vue.ref)(true);
		const isPointerInTransitRef = (0, vue.ref)(false);
		const { start: startTimer, stop: clearTimer } = (0, __vueuse_shared.useTimeoutFn)(() => {
			isOpenDelayed.value = true;
		}, skipDelayDuration, { immediate: false });
		provideTooltipProviderContext({
			isOpenDelayed,
			delayDuration,
			onOpen() {
				clearTimer();
				isOpenDelayed.value = false;
			},
			onClose() {
				startTimer();
			},
			isPointerInTransitRef,
			disableHoverableContent,
			disableClosingTrigger,
			disabled,
			ignoreNonKeyboardFocus
		});
		return (_ctx, _cache) => {
			return (0, vue.renderSlot)(_ctx.$slots, "default");
		};
	}
});

//#endregion
//#region src/Tooltip/TooltipProvider.vue
var TooltipProvider_default = TooltipProvider_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TooltipProvider_default', {
  enumerable: true,
  get: function () {
    return TooltipProvider_default;
  }
});
Object.defineProperty(exports, 'injectTooltipProviderContext', {
  enumerable: true,
  get: function () {
    return injectTooltipProviderContext;
  }
});
//# sourceMappingURL=TooltipProvider.cjs.map