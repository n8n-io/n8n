import { createContext } from "../shared/createContext.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { PopperRoot_default } from "../Popper/PopperRoot.js";
import { injectTooltipProviderContext } from "./TooltipProvider.js";
import { TOOLTIP_OPEN } from "./utils.js";
import { computed, createBlock, defineComponent, openBlock, ref, renderSlot, unref, watch, withCtx } from "vue";
import { useTimeoutFn, useVModel } from "@vueuse/core";

//#region src/Tooltip/TooltipRoot.vue?vue&type=script&setup=true&lang.ts
const [injectTooltipRootContext, provideTooltipRootContext] = createContext("TooltipRoot");
var TooltipRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		useForwardExpose();
		const providerContext = injectTooltipProviderContext();
		const disableHoverableContent = computed(() => props.disableHoverableContent ?? providerContext.disableHoverableContent.value);
		const disableClosingTrigger = computed(() => props.disableClosingTrigger ?? providerContext.disableClosingTrigger.value);
		const disableTooltip = computed(() => props.disabled ?? providerContext.disabled.value);
		const delayDuration = computed(() => props.delayDuration ?? providerContext.delayDuration.value);
		const ignoreNonKeyboardFocus = computed(() => props.ignoreNonKeyboardFocus ?? providerContext.ignoreNonKeyboardFocus.value);
		const open = useVModel(props, "open", emit, {
			defaultValue: props.defaultOpen,
			passive: props.open === void 0
		});
		watch(open, (isOpen) => {
			if (!providerContext.onClose) return;
			if (isOpen) {
				providerContext.onOpen();
				document.dispatchEvent(new CustomEvent(TOOLTIP_OPEN));
			} else providerContext.onClose();
		});
		const wasOpenDelayedRef = ref(false);
		const trigger = ref();
		const stateAttribute = computed(() => {
			if (!open.value) return "closed";
			return wasOpenDelayedRef.value ? "delayed-open" : "instant-open";
		});
		const { start: startTimer, stop: clearTimer } = useTimeoutFn(() => {
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
			return openBlock(), createBlock(unref(PopperRoot_default), null, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { open: unref(open) })]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Tooltip/TooltipRoot.vue
var TooltipRoot_default = TooltipRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TooltipRoot_default, injectTooltipRootContext };
//# sourceMappingURL=TooltipRoot.js.map