const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_FocusScope_stack = require('./stack.cjs');
const require_FocusScope_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_shared = require_rolldown_runtime.__toESM(require("@vueuse/shared"));

//#region src/FocusScope/FocusScope.vue?vue&type=script&setup=true&lang.ts
var FocusScope_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const { currentRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const lastFocusedElementRef = (0, vue.ref)(null);
		const focusScopesStack = require_FocusScope_stack.createFocusScopesStack();
		const focusScope = (0, vue.reactive)({
			paused: false,
			pause() {
				this.paused = true;
			},
			resume() {
				this.paused = false;
			}
		});
		(0, vue.watchEffect)((cleanupFn) => {
			if (!__vueuse_shared.isClient) return;
			const container = currentElement.value;
			if (!props.trapped) return;
			function handleFocusIn(event) {
				if (focusScope.paused || !container) return;
				const target = event.target;
				if (container.contains(target)) lastFocusedElementRef.value = target;
				else require_FocusScope_utils.focus(lastFocusedElementRef.value, { select: true });
			}
			function handleFocusOut(event) {
				if (focusScope.paused || !container) return;
				const relatedTarget = event.relatedTarget;
				if (relatedTarget === null) return;
				if (!container.contains(relatedTarget)) require_FocusScope_utils.focus(lastFocusedElementRef.value, { select: true });
			}
			function handleMutations(mutations) {
				const isLastFocusedElementExist = container.contains(lastFocusedElementRef.value);
				if (!isLastFocusedElementExist) require_FocusScope_utils.focus(container);
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
		(0, vue.watchEffect)(async (cleanupFn) => {
			const container = currentElement.value;
			await (0, vue.nextTick)();
			if (!container) return;
			focusScopesStack.add(focusScope);
			const previouslyFocusedElement = require_shared_getActiveElement.getActiveElement();
			const hasFocusedCandidate = container.contains(previouslyFocusedElement);
			if (!hasFocusedCandidate) {
				const mountEvent = new CustomEvent(require_FocusScope_utils.AUTOFOCUS_ON_MOUNT, require_FocusScope_utils.EVENT_OPTIONS);
				container.addEventListener(require_FocusScope_utils.AUTOFOCUS_ON_MOUNT, (ev) => emits("mountAutoFocus", ev));
				container.dispatchEvent(mountEvent);
				if (!mountEvent.defaultPrevented) {
					require_FocusScope_utils.focusFirst(require_FocusScope_stack.removeLinks(require_FocusScope_utils.getTabbableCandidates(container)), { select: true });
					if (require_shared_getActiveElement.getActiveElement() === previouslyFocusedElement) require_FocusScope_utils.focus(container);
				}
			}
			cleanupFn(() => {
				container.removeEventListener(require_FocusScope_utils.AUTOFOCUS_ON_MOUNT, (ev) => emits("mountAutoFocus", ev));
				const unmountEvent = new CustomEvent(require_FocusScope_utils.AUTOFOCUS_ON_UNMOUNT, require_FocusScope_utils.EVENT_OPTIONS);
				const unmountEventHandler = (ev) => {
					emits("unmountAutoFocus", ev);
				};
				container.addEventListener(require_FocusScope_utils.AUTOFOCUS_ON_UNMOUNT, unmountEventHandler);
				container.dispatchEvent(unmountEvent);
				setTimeout(() => {
					if (!unmountEvent.defaultPrevented) require_FocusScope_utils.focus(previouslyFocusedElement ?? document.body, { select: true });
					container.removeEventListener(require_FocusScope_utils.AUTOFOCUS_ON_UNMOUNT, unmountEventHandler);
					focusScopesStack.remove(focusScope);
				}, 0);
			});
		});
		function handleKeyDown(event) {
			if (!props.loop && !props.trapped) return;
			if (focusScope.paused) return;
			const isTabKey = event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey;
			const focusedElement = require_shared_getActiveElement.getActiveElement();
			if (isTabKey && focusedElement) {
				const container = event.currentTarget;
				const [first, last] = require_FocusScope_utils.getTabbableEdges(container);
				const hasTabbableElementsInside = first && last;
				if (!hasTabbableElementsInside) {
					if (focusedElement === container) event.preventDefault();
				} else if (!event.shiftKey && focusedElement === last) {
					event.preventDefault();
					if (props.loop) require_FocusScope_utils.focus(first, { select: true });
				} else if (event.shiftKey && focusedElement === first) {
					event.preventDefault();
					if (props.loop) require_FocusScope_utils.focus(last, { select: true });
				}
			}
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref_key: "currentRef",
				ref: currentRef,
				tabindex: "-1",
				"as-child": _ctx.asChild,
				as: _ctx.as,
				onKeydown: handleKeyDown
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["as-child", "as"]);
		};
	}
});

//#endregion
//#region src/FocusScope/FocusScope.vue
var FocusScope_default = FocusScope_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'FocusScope_default', {
  enumerable: true,
  get: function () {
    return FocusScope_default;
  }
});
//# sourceMappingURL=FocusScope.cjs.map