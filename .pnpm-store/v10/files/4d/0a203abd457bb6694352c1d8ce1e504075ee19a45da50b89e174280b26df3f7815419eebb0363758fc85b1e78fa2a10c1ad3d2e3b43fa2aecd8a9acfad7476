import { getActiveElement } from "../shared/getActiveElement.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { createFocusScopesStack, removeLinks } from "./stack.js";
import { AUTOFOCUS_ON_MOUNT, AUTOFOCUS_ON_UNMOUNT, EVENT_OPTIONS, focus, focusFirst, getTabbableCandidates, getTabbableEdges } from "./utils.js";
import { createBlock, defineComponent, nextTick, openBlock, reactive, ref, renderSlot, unref, watchEffect, withCtx } from "vue";
import { isClient } from "@vueuse/shared";

//#region src/FocusScope/FocusScope.vue?vue&type=script&setup=true&lang.ts
var FocusScope_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "FocusScope",
	props: {
		loop: {
			type: Boolean,
			required: false,
			default: false
		},
		trapped: {
			type: Boolean,
			required: false,
			default: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	emits: ["mountAutoFocus", "unmountAutoFocus"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { currentRef, currentElement } = useForwardExpose();
		const lastFocusedElementRef = ref(null);
		const focusScopesStack = createFocusScopesStack();
		const focusScope = reactive({
			paused: false,
			pause() {
				this.paused = true;
			},
			resume() {
				this.paused = false;
			}
		});
		watchEffect((cleanupFn) => {
			if (!isClient) return;
			const container = currentElement.value;
			if (!props.trapped) return;
			function handleFocusIn(event) {
				if (focusScope.paused || !container) return;
				const target = event.target;
				if (container.contains(target)) lastFocusedElementRef.value = target;
				else focus(lastFocusedElementRef.value, { select: true });
			}
			function handleFocusOut(event) {
				if (focusScope.paused || !container) return;
				const relatedTarget = event.relatedTarget;
				if (relatedTarget === null) return;
				if (!container.contains(relatedTarget)) focus(lastFocusedElementRef.value, { select: true });
			}
			function handleMutations(mutations) {
				const isLastFocusedElementExist = container.contains(lastFocusedElementRef.value);
				if (!isLastFocusedElementExist) focus(container);
			}
			document.addEventListener("focusin", handleFocusIn);
			document.addEventListener("focusout", handleFocusOut);
			const mutationObserver = new MutationObserver(handleMutations);
			if (container) mutationObserver.observe(container, {
				childList: true,
				subtree: true
			});
			cleanupFn(() => {
				document.removeEventListener("focusin", handleFocusIn);
				document.removeEventListener("focusout", handleFocusOut);
				mutationObserver.disconnect();
			});
		});
		watchEffect(async (cleanupFn) => {
			const container = currentElement.value;
			await nextTick();
			if (!container) return;
			focusScopesStack.add(focusScope);
			const previouslyFocusedElement = getActiveElement();
			const hasFocusedCandidate = container.contains(previouslyFocusedElement);
			if (!hasFocusedCandidate) {
				const mountEvent = new CustomEvent(AUTOFOCUS_ON_MOUNT, EVENT_OPTIONS);
				container.addEventListener(AUTOFOCUS_ON_MOUNT, (ev) => emits("mountAutoFocus", ev));
				container.dispatchEvent(mountEvent);
				if (!mountEvent.defaultPrevented) {
					focusFirst(removeLinks(getTabbableCandidates(container)), { select: true });
					if (getActiveElement() === previouslyFocusedElement) focus(container);
				}
			}
			cleanupFn(() => {
				container.removeEventListener(AUTOFOCUS_ON_MOUNT, (ev) => emits("mountAutoFocus", ev));
				const unmountEvent = new CustomEvent(AUTOFOCUS_ON_UNMOUNT, EVENT_OPTIONS);
				const unmountEventHandler = (ev) => {
					emits("unmountAutoFocus", ev);
				};
				container.addEventListener(AUTOFOCUS_ON_UNMOUNT, unmountEventHandler);
				container.dispatchEvent(unmountEvent);
				setTimeout(() => {
					if (!unmountEvent.defaultPrevented) focus(previouslyFocusedElement ?? document.body, { select: true });
					container.removeEventListener(AUTOFOCUS_ON_UNMOUNT, unmountEventHandler);
					focusScopesStack.remove(focusScope);
				}, 0);
			});
		});
		function handleKeyDown(event) {
			if (!props.loop && !props.trapped) return;
			if (focusScope.paused) return;
			const isTabKey = event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey;
			const focusedElement = getActiveElement();
			if (isTabKey && focusedElement) {
				const container = event.currentTarget;
				const [first, last] = getTabbableEdges(container);
				const hasTabbableElementsInside = first && last;
				if (!hasTabbableElementsInside) {
					if (focusedElement === container) event.preventDefault();
				} else if (!event.shiftKey && focusedElement === last) {
					event.preventDefault();
					if (props.loop) focus(first, { select: true });
				} else if (event.shiftKey && focusedElement === first) {
					event.preventDefault();
					if (props.loop) focus(last, { select: true });
				}
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref_key: "currentRef",
				ref: currentRef,
				tabindex: "-1",
				"as-child": _ctx.asChild,
				as: _ctx.as,
				onKeydown: handleKeyDown
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["as-child", "as"]);
		};
	}
});

//#endregion
//#region src/FocusScope/FocusScope.vue
var FocusScope_default = FocusScope_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { FocusScope_default };
//# sourceMappingURL=FocusScope.js.map