import { getActiveElement } from "../shared/getActiveElement.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { DismissableLayerBranch_default } from "../DismissableLayer/DismissableLayerBranch.js";
import { focusFirst, getTabbableCandidates } from "../FocusScope/utils.js";
import { useCollection } from "../Collection/Collection.js";
import { injectToastProviderContext } from "./ToastProvider.js";
import { VIEWPORT_PAUSE, VIEWPORT_RESUME } from "./utils.js";
import { FocusProxy_default } from "./FocusProxy.js";
import { computed, createBlock, createCommentVNode, createVNode, defineComponent, mergeProps, normalizeStyle, onMounted, openBlock, ref, renderSlot, toRefs, unref, watchEffect, withCtx } from "vue";
import { onKeyStroke, unrefElement } from "@vueuse/core";

//#region src/Toast/ToastViewport.vue?vue&type=script&setup=true&lang.ts
var ToastViewport_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const { hotkey, label } = toRefs(props);
		const { forwardRef, currentElement } = useForwardExpose();
		const { CollectionSlot, getItems } = useCollection();
		const providerContext = injectToastProviderContext();
		const hasToasts = computed(() => providerContext.toastCount.value > 0);
		const headFocusProxyRef = ref();
		const tailFocusProxyRef = ref();
		const hotkeyMessage = computed(() => hotkey.value.join("+").replace(/Key/g, "").replace(/Digit/g, ""));
		onKeyStroke(hotkey.value, () => {
			currentElement.value.focus();
		});
		onMounted(() => {
			providerContext.onViewportChange(currentElement.value);
		});
		watchEffect((cleanupFn) => {
			const viewport = currentElement.value;
			if (hasToasts.value && viewport) {
				const handlePause = () => {
					if (!providerContext.isClosePausedRef.value) {
						const pauseEvent = new CustomEvent(VIEWPORT_PAUSE);
						viewport.dispatchEvent(pauseEvent);
						providerContext.isClosePausedRef.value = true;
					}
				};
				const handleResume = () => {
					if (providerContext.isClosePausedRef.value) {
						const resumeEvent = new CustomEvent(VIEWPORT_RESUME);
						viewport.dispatchEvent(resumeEvent);
						providerContext.isClosePausedRef.value = false;
					}
				};
				const handleFocusOutResume = (event) => {
					const isFocusMovingOutside = !viewport.contains(event.relatedTarget);
					if (isFocusMovingOutside) handleResume();
				};
				const handlePointerLeaveResume = () => {
					const isFocusInside = viewport.contains(getActiveElement());
					if (!isFocusInside) handleResume();
				};
				const handleKeyDown = (event) => {
					const isMetaKey = event.altKey || event.ctrlKey || event.metaKey;
					const isTabKey = event.key === "Tab" && !isMetaKey;
					if (isTabKey) {
						const focusedElement = getActiveElement();
						const isTabbingBackwards = event.shiftKey;
						const targetIsViewport = event.target === viewport;
						if (targetIsViewport && isTabbingBackwards) {
							headFocusProxyRef.value?.focus();
							return;
						}
						const tabbingDirection = isTabbingBackwards ? "backwards" : "forwards";
						const sortedCandidates = getSortedTabbableCandidates({ tabbingDirection });
						const index = sortedCandidates.findIndex((candidate) => candidate === focusedElement);
						if (focusFirst(sortedCandidates.slice(index + 1))) event.preventDefault();
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
				const toastTabbableCandidates = [toastNode, ...getTabbableCandidates(toastNode)];
				return tabbingDirection === "forwards" ? toastTabbableCandidates : toastTabbableCandidates.reverse();
			});
			return (tabbingDirection === "forwards" ? tabbableCandidates.reverse() : tabbableCandidates).flat();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DismissableLayerBranch_default), {
				role: "region",
				"aria-label": typeof unref(label) === "string" ? unref(label).replace("{hotkey}", hotkeyMessage.value) : unref(label)(hotkeyMessage.value),
				tabindex: "-1",
				style: normalizeStyle({ pointerEvents: hasToasts.value ? void 0 : "none" })
			}, {
				default: withCtx(() => [
					hasToasts.value ? (openBlock(), createBlock(FocusProxy_default, {
						key: 0,
						ref: (node) => {
							headFocusProxyRef.value = unref(unrefElement)(node);
							return void 0;
						},
						onFocusFromOutsideViewport: _cache[0] || (_cache[0] = () => {
							const tabbableCandidates = getSortedTabbableCandidates({ tabbingDirection: "forwards" });
							unref(focusFirst)(tabbableCandidates);
						})
					}, null, 512)) : createCommentVNode("v-if", true),
					createVNode(unref(CollectionSlot), null, {
						default: withCtx(() => [createVNode(unref(Primitive), mergeProps({
							ref: unref(forwardRef),
							tabindex: "-1",
							as: _ctx.as,
							"as-child": _ctx.asChild
						}, _ctx.$attrs), {
							default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
							_: 3
						}, 16, ["as", "as-child"])]),
						_: 3
					}),
					hasToasts.value ? (openBlock(), createBlock(FocusProxy_default, {
						key: 1,
						ref: (node) => {
							tailFocusProxyRef.value = unref(unrefElement)(node);
							return void 0;
						},
						onFocusFromOutsideViewport: _cache[1] || (_cache[1] = () => {
							const tabbableCandidates = getSortedTabbableCandidates({ tabbingDirection: "backwards" });
							unref(focusFirst)(tabbableCandidates);
						})
					}, null, 512)) : createCommentVNode("v-if", true)
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
export { ToastViewport_default };
//# sourceMappingURL=ToastViewport.js.map