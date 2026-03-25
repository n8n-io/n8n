const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_Toast_ToastProvider = require('./ToastProvider.cjs');
const require_Toast_ToastAnnounce = require('./ToastAnnounce.cjs');
const require_Toast_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));
const __vueuse_shared = require_rolldown_runtime.__toESM(require("@vueuse/shared"));

//#region src/Toast/ToastRootImpl.vue?vue&type=script&setup=true&lang.ts
const [injectToastRootContext, provideToastRootContext] = require_shared_createContext.createContext("ToastRoot");
var ToastRootImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const { CollectionItem } = require_Collection_Collection.useCollection();
		const providerContext = require_Toast_ToastProvider.injectToastProviderContext();
		const pointerStartRef = (0, vue.ref)(null);
		const swipeDeltaRef = (0, vue.ref)(null);
		const duration = (0, vue.computed)(() => typeof props.duration === "number" ? props.duration : providerContext.duration.value);
		const closeTimerStartTimeRef = (0, vue.ref)(0);
		const closeTimerRemainingTimeRef = (0, vue.ref)(duration.value);
		const closeTimerRef = (0, vue.ref)(0);
		const remainingTime = (0, vue.ref)(duration.value);
		const remainingRaf = (0, __vueuse_core.useRafFn)(() => {
			const elapsedTime = (/* @__PURE__ */ new Date()).getTime() - closeTimerStartTimeRef.value;
			remainingTime.value = Math.max(closeTimerRemainingTimeRef.value - elapsedTime, 0);
		}, { fpsLimit: 60 });
		function startTimer(duration$1) {
			if (duration$1 <= 0 || duration$1 === Number.POSITIVE_INFINITY) return;
			if (!__vueuse_shared.isClient) return;
			window.clearTimeout(closeTimerRef.value);
			closeTimerStartTimeRef.value = (/* @__PURE__ */ new Date()).getTime();
			closeTimerRef.value = window.setTimeout(handleClose, duration$1);
		}
		function handleClose(event) {
			const isNonPointerEvent = event?.pointerType === "";
			const isFocusInToast = currentElement.value?.contains(require_shared_getActiveElement.getActiveElement());
			if (isFocusInToast && isNonPointerEvent) providerContext.viewport.value?.focus();
			if (isNonPointerEvent) providerContext.isClosePausedRef.value = false;
			emits("close");
		}
		const announceTextContent = (0, vue.computed)(() => currentElement.value ? require_Toast_utils.getAnnounceTextContent(currentElement.value) : null);
		if (props.type && !["foreground", "background"].includes(props.type)) {
			const error = "Invalid prop `type` supplied to `Toast`. Expected `foreground | background`.";
			throw new Error(error);
		}
		(0, vue.watchEffect)((cleanupFn) => {
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
				viewport.addEventListener(require_Toast_utils.VIEWPORT_PAUSE, handlePause);
				viewport.addEventListener(require_Toast_utils.VIEWPORT_RESUME, handleResume);
				return () => {
					viewport.removeEventListener(require_Toast_utils.VIEWPORT_PAUSE, handlePause);
					viewport.removeEventListener(require_Toast_utils.VIEWPORT_RESUME, handleResume);
				};
			}
		});
		(0, vue.watch)(() => [props.open, duration.value], () => {
			closeTimerRemainingTimeRef.value = duration.value;
			if (props.open && !providerContext.isClosePausedRef.value) startTimer(duration.value);
		}, { immediate: true });
		(0, __vueuse_core.onKeyStroke)("Escape", (event) => {
			emits("escapeKeyDown", event);
			if (!event.defaultPrevented) {
				providerContext.isFocusedToastEscapeKeyDownRef.value = true;
				handleClose();
			}
		});
		(0, vue.onMounted)(() => {
			providerContext.onToastAdd();
		});
		(0, vue.onUnmounted)(() => {
			providerContext.onToastRemove();
		});
		provideToastRootContext({ onClose: handleClose });
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createElementBlock)(vue.Fragment, null, [announceTextContent.value ? ((0, vue.openBlock)(), (0, vue.createBlock)(require_Toast_ToastAnnounce.ToastAnnounce_default, {
				key: 0,
				role: "alert",
				"aria-live": _ctx.type === "foreground" ? "assertive" : "polite",
				"aria-atomic": "true"
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createTextVNode)((0, vue.toDisplayString)(announceTextContent.value), 1)]),
				_: 1
			}, 8, ["aria-live"])) : (0, vue.createCommentVNode)("v-if", true), (0, vue.unref)(providerContext).viewport.value ? ((0, vue.openBlock)(), (0, vue.createBlock)(vue.Teleport, {
				key: 1,
				to: (0, vue.unref)(providerContext).viewport.value
			}, [(0, vue.createVNode)((0, vue.unref)(CollectionItem), null, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
					ref: (0, vue.unref)(forwardRef),
					role: "alert",
					"aria-live": "off",
					"aria-atomic": "true",
					tabindex: "0"
				}, _ctx.$attrs, {
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"data-state": _ctx.open ? "open" : "closed",
					"data-swipe-direction": (0, vue.unref)(providerContext).swipeDirection.value,
					style: {
						userSelect: "none",
						touchAction: "none"
					},
					onPointerdown: _cache[0] || (_cache[0] = (0, vue.withModifiers)((event) => {
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
						const isHorizontalSwipe = ["left", "right"].includes((0, vue.unref)(providerContext).swipeDirection.value);
						const clamp = ["left", "up"].includes((0, vue.unref)(providerContext).swipeDirection.value) ? Math.min : Math.max;
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
							(0, vue.unref)(require_Toast_utils.handleAndDispatchCustomEvent)((0, vue.unref)(require_Toast_utils.TOAST_SWIPE_MOVE), (ev) => emits("swipeMove", ev), eventDetail);
						} else if ((0, vue.unref)(require_Toast_utils.isDeltaInDirection)(delta, (0, vue.unref)(providerContext).swipeDirection.value, moveStartBuffer)) {
							swipeDeltaRef.value = delta;
							(0, vue.unref)(require_Toast_utils.handleAndDispatchCustomEvent)((0, vue.unref)(require_Toast_utils.TOAST_SWIPE_START), (ev) => emits("swipeStart", ev), eventDetail);
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
							if ((0, vue.unref)(require_Toast_utils.isDeltaInDirection)(delta, (0, vue.unref)(providerContext).swipeDirection.value, (0, vue.unref)(providerContext).swipeThreshold.value)) (0, vue.unref)(require_Toast_utils.handleAndDispatchCustomEvent)((0, vue.unref)(require_Toast_utils.TOAST_SWIPE_END), (ev) => emits("swipeEnd", ev), eventDetail);
							else (0, vue.unref)(require_Toast_utils.handleAndDispatchCustomEvent)((0, vue.unref)(require_Toast_utils.TOAST_SWIPE_CANCEL), (ev) => emits("swipeCancel", ev), eventDetail);
							toast?.addEventListener("click", (event$1) => event$1.preventDefault(), { once: true });
						}
					})
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
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
			})], 8, ["to"])) : (0, vue.createCommentVNode)("v-if", true)], 64);
		};
	}
});

//#endregion
//#region src/Toast/ToastRootImpl.vue
var ToastRootImpl_default = ToastRootImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ToastRootImpl_default', {
  enumerable: true,
  get: function () {
    return ToastRootImpl_default;
  }
});
Object.defineProperty(exports, 'injectToastRootContext', {
  enumerable: true,
  get: function () {
    return injectToastRootContext;
  }
});
//# sourceMappingURL=ToastRootImpl.cjs.map