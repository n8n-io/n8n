import { createContext } from "../shared/createContext.js";
import { getActiveElement } from "../shared/getActiveElement.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useCollection } from "../Collection/Collection.js";
import { injectToastProviderContext } from "./ToastProvider.js";
import { ToastAnnounce_default } from "./ToastAnnounce.js";
import { TOAST_SWIPE_CANCEL, TOAST_SWIPE_END, TOAST_SWIPE_MOVE, TOAST_SWIPE_START, VIEWPORT_PAUSE, VIEWPORT_RESUME, getAnnounceTextContent, handleAndDispatchCustomEvent, isDeltaInDirection } from "./utils.js";
import { Fragment, Teleport, computed, createBlock, createCommentVNode, createElementBlock, createTextVNode, createVNode, defineComponent, mergeProps, onMounted, onUnmounted, openBlock, ref, renderSlot, toDisplayString, unref, watch, watchEffect, withCtx, withModifiers } from "vue";
import { onKeyStroke, useRafFn } from "@vueuse/core";
import { isClient } from "@vueuse/shared";

//#region src/Toast/ToastRootImpl.vue?vue&type=script&setup=true&lang.ts
const [injectToastRootContext, provideToastRootContext] = createContext("ToastRoot");
var ToastRootImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ToastRootImpl",
	props: {
		type: {
			type: String,
			required: false
		},
		open: {
			type: Boolean,
			required: false,
			default: false
		},
		duration: {
			type: Number,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "li"
		}
	},
	emits: [
		"close",
		"escapeKeyDown",
		"pause",
		"resume",
		"swipeStart",
		"swipeMove",
		"swipeCancel",
		"swipeEnd"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { forwardRef, currentElement } = useForwardExpose();
		const { CollectionItem } = useCollection();
		const providerContext = injectToastProviderContext();
		const pointerStartRef = ref(null);
		const swipeDeltaRef = ref(null);
		const duration = computed(() => typeof props.duration === "number" ? props.duration : providerContext.duration.value);
		const closeTimerStartTimeRef = ref(0);
		const closeTimerRemainingTimeRef = ref(duration.value);
		const closeTimerRef = ref(0);
		const remainingTime = ref(duration.value);
		const remainingRaf = useRafFn(() => {
			const elapsedTime = (/* @__PURE__ */ new Date()).getTime() - closeTimerStartTimeRef.value;
			remainingTime.value = Math.max(closeTimerRemainingTimeRef.value - elapsedTime, 0);
		}, { fpsLimit: 60 });
		function startTimer(duration$1) {
			if (duration$1 <= 0 || duration$1 === Number.POSITIVE_INFINITY) return;
			if (!isClient) return;
			window.clearTimeout(closeTimerRef.value);
			closeTimerStartTimeRef.value = (/* @__PURE__ */ new Date()).getTime();
			closeTimerRef.value = window.setTimeout(handleClose, duration$1);
		}
		function handleClose(event) {
			const isNonPointerEvent = event?.pointerType === "";
			const isFocusInToast = currentElement.value?.contains(getActiveElement());
			if (isFocusInToast && isNonPointerEvent) providerContext.viewport.value?.focus();
			if (isNonPointerEvent) providerContext.isClosePausedRef.value = false;
			emits("close");
		}
		const announceTextContent = computed(() => currentElement.value ? getAnnounceTextContent(currentElement.value) : null);
		if (props.type && !["foreground", "background"].includes(props.type)) {
			const error = "Invalid prop `type` supplied to `Toast`. Expected `foreground | background`.";
			throw new Error(error);
		}
		watchEffect((cleanupFn) => {
			const viewport = providerContext.viewport.value;
			if (viewport) {
				const handleResume = () => {
					startTimer(closeTimerRemainingTimeRef.value);
					remainingRaf.resume();
					emits("resume");
				};
				const handlePause = () => {
					const elapsedTime = (/* @__PURE__ */ new Date()).getTime() - closeTimerStartTimeRef.value;
					closeTimerRemainingTimeRef.value = closeTimerRemainingTimeRef.value - elapsedTime;
					window.clearTimeout(closeTimerRef.value);
					remainingRaf.pause();
					emits("pause");
				};
				viewport.addEventListener(VIEWPORT_PAUSE, handlePause);
				viewport.addEventListener(VIEWPORT_RESUME, handleResume);
				return () => {
					viewport.removeEventListener(VIEWPORT_PAUSE, handlePause);
					viewport.removeEventListener(VIEWPORT_RESUME, handleResume);
				};
			}
		});
		watch(() => [props.open, duration.value], () => {
			closeTimerRemainingTimeRef.value = duration.value;
			if (props.open && !providerContext.isClosePausedRef.value) startTimer(duration.value);
		}, { immediate: true });
		onKeyStroke("Escape", (event) => {
			emits("escapeKeyDown", event);
			if (!event.defaultPrevented) {
				providerContext.isFocusedToastEscapeKeyDownRef.value = true;
				handleClose();
			}
		});
		onMounted(() => {
			providerContext.onToastAdd();
		});
		onUnmounted(() => {
			providerContext.onToastRemove();
		});
		provideToastRootContext({ onClose: handleClose });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock(Fragment, null, [announceTextContent.value ? (openBlock(), createBlock(ToastAnnounce_default, {
				key: 0,
				role: "alert",
				"aria-live": _ctx.type === "foreground" ? "assertive" : "polite",
				"aria-atomic": "true"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(announceTextContent.value), 1)]),
				_: 1
			}, 8, ["aria-live"])) : createCommentVNode("v-if", true), unref(providerContext).viewport.value ? (openBlock(), createBlock(Teleport, {
				key: 1,
				to: unref(providerContext).viewport.value
			}, [createVNode(unref(CollectionItem), null, {
				default: withCtx(() => [createVNode(unref(Primitive), mergeProps({
					ref: unref(forwardRef),
					role: "alert",
					"aria-live": "off",
					"aria-atomic": "true",
					tabindex: "0"
				}, _ctx.$attrs, {
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"data-state": _ctx.open ? "open" : "closed",
					"data-swipe-direction": unref(providerContext).swipeDirection.value,
					style: {
						userSelect: "none",
						touchAction: "none"
					},
					onPointerdown: _cache[0] || (_cache[0] = withModifiers((event) => {
						pointerStartRef.value = {
							x: event.clientX,
							y: event.clientY
						};
					}, ["left"])),
					onPointermove: _cache[1] || (_cache[1] = (event) => {
						if (!pointerStartRef.value) return;
						const x = event.clientX - pointerStartRef.value.x;
						const y = event.clientY - pointerStartRef.value.y;
						const hasSwipeMoveStarted = Boolean(swipeDeltaRef.value);
						const isHorizontalSwipe = ["left", "right"].includes(unref(providerContext).swipeDirection.value);
						const clamp = ["left", "up"].includes(unref(providerContext).swipeDirection.value) ? Math.min : Math.max;
						const clampedX = isHorizontalSwipe ? clamp(0, x) : 0;
						const clampedY = !isHorizontalSwipe ? clamp(0, y) : 0;
						const moveStartBuffer = event.pointerType === "touch" ? 10 : 2;
						const delta = {
							x: clampedX,
							y: clampedY
						};
						const eventDetail = {
							originalEvent: event,
							delta
						};
						if (hasSwipeMoveStarted) {
							swipeDeltaRef.value = delta;
							unref(handleAndDispatchCustomEvent)(unref(TOAST_SWIPE_MOVE), (ev) => emits("swipeMove", ev), eventDetail);
						} else if (unref(isDeltaInDirection)(delta, unref(providerContext).swipeDirection.value, moveStartBuffer)) {
							swipeDeltaRef.value = delta;
							unref(handleAndDispatchCustomEvent)(unref(TOAST_SWIPE_START), (ev) => emits("swipeStart", ev), eventDetail);
							event.target.setPointerCapture(event.pointerId);
						} else if (Math.abs(x) > moveStartBuffer || Math.abs(y) > moveStartBuffer) pointerStartRef.value = null;
					}),
					onPointerup: _cache[2] || (_cache[2] = (event) => {
						const delta = swipeDeltaRef.value;
						const target = event.target;
						if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
						swipeDeltaRef.value = null;
						pointerStartRef.value = null;
						if (delta) {
							const toast = event.currentTarget;
							const eventDetail = {
								originalEvent: event,
								delta
							};
							if (unref(isDeltaInDirection)(delta, unref(providerContext).swipeDirection.value, unref(providerContext).swipeThreshold.value)) unref(handleAndDispatchCustomEvent)(unref(TOAST_SWIPE_END), (ev) => emits("swipeEnd", ev), eventDetail);
							else unref(handleAndDispatchCustomEvent)(unref(TOAST_SWIPE_CANCEL), (ev) => emits("swipeCancel", ev), eventDetail);
							toast?.addEventListener("click", (event$1) => event$1.preventDefault(), { once: true });
						}
					})
				}), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default", {
						remaining: remainingTime.value,
						duration: duration.value
					})]),
					_: 3
				}, 16, [
					"as",
					"as-child",
					"data-state",
					"data-swipe-direction"
				])]),
				_: 3
			})], 8, ["to"])) : createCommentVNode("v-if", true)], 64);
		};
	}
});

//#endregion
//#region src/Toast/ToastRootImpl.vue
var ToastRootImpl_default = ToastRootImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ToastRootImpl_default, injectToastRootContext };
//# sourceMappingURL=ToastRootImpl.js.map