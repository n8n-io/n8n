import { createContext } from "../shared/createContext.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { defineComponent, ref, renderSlot, toRefs } from "vue";
import { useTimeoutFn } from "@vueuse/shared";

//#region src/Tooltip/TooltipProvider.vue?vue&type=script&setup=true&lang.ts
const [injectTooltipProviderContext, provideTooltipProviderContext] = createContext("TooltipProvider");
var TooltipProvider_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const { delayDuration, skipDelayDuration, disableHoverableContent, disableClosingTrigger, ignoreNonKeyboardFocus, disabled } = toRefs(props);
		useForwardExpose();
		const isOpenDelayed = ref(true);
		const isPointerInTransitRef = ref(false);
		const { start: startTimer, stop: clearTimer } = useTimeoutFn(() => {
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
			return renderSlot(_ctx.$slots, "default");
		};
	}
});

//#endregion
//#region src/Tooltip/TooltipProvider.vue
var TooltipProvider_default = TooltipProvider_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TooltipProvider_default, injectTooltipProviderContext };
//# sourceMappingURL=TooltipProvider.js.map