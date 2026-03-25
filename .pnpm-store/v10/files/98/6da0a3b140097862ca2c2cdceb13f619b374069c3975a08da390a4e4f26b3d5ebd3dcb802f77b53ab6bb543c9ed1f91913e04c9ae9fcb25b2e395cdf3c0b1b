const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_DismissableLayer_DismissableLayerBranch = require('../DismissableLayer/DismissableLayerBranch.cjs');
const require_FocusScope_utils = require('../FocusScope/utils.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_Toast_ToastProvider = require('./ToastProvider.cjs');
const require_Toast_utils = require('./utils.cjs');
const require_Toast_FocusProxy = require('./FocusProxy.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Toast/ToastViewport.vue?vue&type=script&setup=true&lang.ts
var ToastViewport_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "ToastViewport",
	props: {
		hotkey: {
			type: Array,
			required: false,
			default: () => ["F8"]
		},
		label: {
			type: [String, Function],
			required: false,
			default: "Notifications ({hotkey})"
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "ol"
		}
	},
	setup(__props) {
		const props = __props;
		const { hotkey, label } = (0, vue.toRefs)(props);
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const { CollectionSlot, getItems } = require_Collection_Collection.useCollection();
		const providerContext = require_Toast_ToastProvider.injectToastProviderContext();
		const hasToasts = (0, vue.computed)(() => providerContext.toastCount.value > 0);
		const headFocusProxyRef = (0, vue.ref)();
		const tailFocusProxyRef = (0, vue.ref)();
		const hotkeyMessage = (0, vue.computed)(() => hotkey.value.join("+").replace(/Key/g, "").replace(/Digit/g, ""));
		(0, __vueuse_core.onKeyStroke)(hotkey.value, () => {
			currentElement.value.focus();
		});
		(0, vue.onMounted)(() => {
			providerContext.onViewportChange(currentElement.value);
		});
		(0, vue.watchEffect)((cleanupFn) => {
			const viewport = currentElement.value;
			if (hasToasts.value && viewport) {
				const handlePause = () => {
					if (!providerContext.isClosePausedRef.value) {
						const pauseEvent = new CustomEvent(require_Toast_utils.VIEWPORT_PAUSE);
						viewport.dispatchEvent(pauseEvent);
						providerContext.isClosePausedRef.value = true;
					}
				};
				const handleResume = () => {
					if (providerContext.isClosePausedRef.value) {
						const resumeEvent = new CustomEvent(require_Toast_utils.VIEWPORT_RESUME);
						viewport.dispatchEvent(resumeEvent);
						providerContext.isClosePausedRef.value = false;
					}
				};
				const handleFocusOutResume = (event) => {
					const isFocusMovingOutside = !viewport.contains(event.relatedTarget);
					if (isFocusMovingOutside) handleResume();
				};
				const handlePointerLeaveResume = () => {
					const isFocusInside = viewport.contains(require_shared_getActiveElement.getActiveElement());
					if (!isFocusInside) handleResume();
				};
				const handleKeyDown = (event) => {
					const isMetaKey = event.altKey || event.ctrlKey || event.metaKey;
					const isTabKey = event.key === "Tab" && !isMetaKey;
					if (isTabKey) {
						const focusedElement = require_shared_getActiveElement.getActiveElement();
						const isTabbingBackwards = event.shiftKey;
						const targetIsViewport = event.target === viewport;
						if (targetIsViewport && isTabbingBackwards) {
							headFocusProxyRef.value?.focus();
							return;
						}
						const tabbingDirection = isTabbingBackwards ? "backwards" : "forwards";
						const sortedCandidates = getSortedTabbableCandidates({ tabbingDirection });
						const index = sortedCandidates.findIndex((candidate) => candidate === focusedElement);
						if (require_FocusScope_utils.focusFirst(sortedCandidates.slice(index + 1))) event.preventDefault();
						else isTabbingBackwards ? headFocusProxyRef.value?.focus() : tailFocusProxyRef.value?.focus();
					}
				};
				viewport.addEventListener("focusin", handlePause);
				viewport.addEventListener("focusout", handleFocusOutResume);
				viewport.addEventListener("pointermove", handlePause);
				viewport.addEventListener("pointerleave", handlePointerLeaveResume);
				viewport.addEventListener("keydown", handleKeyDown);
				window.addEventListener("blur", handlePause);
				window.addEventListener("focus", handleResume);
				cleanupFn(() => {
					viewport.removeEventListener("focusin", handlePause);
					viewport.removeEventListener("focusout", handleFocusOutResume);
					viewport.removeEventListener("pointermove", handlePause);
					viewport.removeEventListener("pointerleave", handlePointerLeaveResume);
					viewport.removeEventListener("keydown", handleKeyDown);
					window.removeEventListener("blur", handlePause);
					window.removeEventListener("focus", handleResume);
				});
			}
		});
		function getSortedTabbableCandidates({ tabbingDirection }) {
			const toastItems = getItems().map((i) => i.ref);
			const tabbableCandidates = toastItems.map((toastNode) => {
				const toastTabbableCandidates = [toastNode, ...require_FocusScope_utils.getTabbableCandidates(toastNode)];
				return tabbingDirection === "forwards" ? toastTabbableCandidates : toastTabbableCandidates.reverse();
			});
			return (tabbingDirection === "forwards" ? tabbableCandidates.reverse() : tabbableCandidates).flat();
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_DismissableLayer_DismissableLayerBranch.DismissableLayerBranch_default), {
				role: "region",
				"aria-label": typeof (0, vue.unref)(label) === "string" ? (0, vue.unref)(label).replace("{hotkey}", hotkeyMessage.value) : (0, vue.unref)(label)(hotkeyMessage.value),
				tabindex: "-1",
				style: (0, vue.normalizeStyle)({ pointerEvents: hasToasts.value ? void 0 : "none" })
			}, {
				default: (0, vue.withCtx)(() => [
					hasToasts.value ? ((0, vue.openBlock)(), (0, vue.createBlock)(require_Toast_FocusProxy.FocusProxy_default, {
						key: 0,
						ref: (node) => {
							headFocusProxyRef.value = (0, vue.unref)(__vueuse_core.unrefElement)(node);
							return void 0;
						},
						onFocusFromOutsideViewport: _cache[0] || (_cache[0] = () => {
							const tabbableCandidates = getSortedTabbableCandidates({ tabbingDirection: "forwards" });
							(0, vue.unref)(require_FocusScope_utils.focusFirst)(tabbableCandidates);
						})
					}, null, 512)) : (0, vue.createCommentVNode)("v-if", true),
					(0, vue.createVNode)((0, vue.unref)(CollectionSlot), null, {
						default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
							ref: (0, vue.unref)(forwardRef),
							tabindex: "-1",
							as: _ctx.as,
							"as-child": _ctx.asChild
						}, _ctx.$attrs), {
							default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
							_: 3
						}, 16, ["as", "as-child"])]),
						_: 3
					}),
					hasToasts.value ? ((0, vue.openBlock)(), (0, vue.createBlock)(require_Toast_FocusProxy.FocusProxy_default, {
						key: 1,
						ref: (node) => {
							tailFocusProxyRef.value = (0, vue.unref)(__vueuse_core.unrefElement)(node);
							return void 0;
						},
						onFocusFromOutsideViewport: _cache[1] || (_cache[1] = () => {
							const tabbableCandidates = getSortedTabbableCandidates({ tabbingDirection: "backwards" });
							(0, vue.unref)(require_FocusScope_utils.focusFirst)(tabbableCandidates);
						})
					}, null, 512)) : (0, vue.createCommentVNode)("v-if", true)
				]),
				_: 3
			}, 8, ["aria-label", "style"]);
		};
	}
});

//#endregion
//#region src/Toast/ToastViewport.vue
var ToastViewport_default = ToastViewport_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ToastViewport_default', {
  enumerable: true,
  get: function () {
    return ToastViewport_default;
  }
});
//# sourceMappingURL=ToastViewport.cjs.map