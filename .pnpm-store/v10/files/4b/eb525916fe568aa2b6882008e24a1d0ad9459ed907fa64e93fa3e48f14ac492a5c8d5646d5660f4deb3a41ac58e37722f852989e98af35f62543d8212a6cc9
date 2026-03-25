const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useStateMachine = require('../shared/useStateMachine.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));
const __vueuse_shared = require_rolldown_runtime.__toESM(require("@vueuse/shared"));

//#region src/Presence/usePresence.ts
function usePresence(present, node) {
	const stylesRef = (0, vue.ref)({});
	const prevAnimationNameRef = (0, vue.ref)("none");
	const prevPresentRef = (0, vue.ref)(present);
	const initialState = present.value ? "mounted" : "unmounted";
	let timeoutId;
	const ownerWindow = node.value?.ownerDocument.defaultView ?? __vueuse_core.defaultWindow;
	const { state, dispatch } = require_shared_useStateMachine.useStateMachine(initialState, {
		mounted: {
			UNMOUNT: "unmounted",
			ANIMATION_OUT: "unmountSuspended"
		},
		unmountSuspended: {
			MOUNT: "mounted",
			ANIMATION_END: "unmounted"
		},
		unmounted: { MOUNT: "mounted" }
	});
	const dispatchCustomEvent = (name) => {
		if (__vueuse_shared.isClient) {
			const customEvent = new CustomEvent(name, {
				bubbles: false,
				cancelable: false
			});
			node.value?.dispatchEvent(customEvent);
		}
	};
	(0, vue.watch)(present, async (currentPresent, prevPresent) => {
		const hasPresentChanged = prevPresent !== currentPresent;
		await (0, vue.nextTick)();
		if (hasPresentChanged) {
			const prevAnimationName = prevAnimationNameRef.value;
			const currentAnimationName = getAnimationName(node.value);
			if (currentPresent) {
				dispatch("MOUNT");
				dispatchCustomEvent("enter");
				if (currentAnimationName === "none") dispatchCustomEvent("after-enter");
			} else if (currentAnimationName === "none" || currentAnimationName === "undefined" || stylesRef.value?.display === "none") {
				dispatch("UNMOUNT");
				dispatchCustomEvent("leave");
				dispatchCustomEvent("after-leave");
			} else {
				/**
				* When `present` changes to `false`, we check changes to animation-name to
				* determine whether an animation has started. We chose this approach (reading
				* computed styles) because there is no `animationrun` event and `animationstart`
				* fires after `animation-delay` has expired which would be too late.
				*/
				const isAnimating = prevAnimationName !== currentAnimationName;
				if (prevPresent && isAnimating) {
					dispatch("ANIMATION_OUT");
					dispatchCustomEvent("leave");
				} else {
					dispatch("UNMOUNT");
					dispatchCustomEvent("after-leave");
				}
			}
		}
	}, { immediate: true });
	/**
	* Triggering an ANIMATION_OUT during an ANIMATION_IN will fire an `animationcancel`
	* event for ANIMATION_IN after we have entered `unmountSuspended` state. So, we
	* make sure we only trigger ANIMATION_END for the currently active animation.
	*/
	const handleAnimationEnd = (event) => {
		const currentAnimationName = getAnimationName(node.value);
		const isCurrentAnimation = currentAnimationName.includes(event.animationName);
		const directionName = state.value === "mounted" ? "enter" : "leave";
		if (event.target === node.value && isCurrentAnimation) {
			dispatchCustomEvent(`after-${directionName}`);
			dispatch("ANIMATION_END");
			if (!prevPresentRef.value) {
				const currentFillMode = node.value.style.animationFillMode;
				node.value.style.animationFillMode = "forwards";
				timeoutId = ownerWindow?.setTimeout(() => {
					if (node.value?.style.animationFillMode === "forwards") node.value.style.animationFillMode = currentFillMode;
				});
			}
		}
		if (event.target === node.value && currentAnimationName === "none") dispatch("ANIMATION_END");
	};
	const handleAnimationStart = (event) => {
		if (event.target === node.value) prevAnimationNameRef.value = getAnimationName(node.value);
	};
	const watcher = (0, vue.watch)(node, (newNode, oldNode) => {
		if (newNode) {
			stylesRef.value = getComputedStyle(newNode);
			newNode.addEventListener("animationstart", handleAnimationStart);
			newNode.addEventListener("animationcancel", handleAnimationEnd);
			newNode.addEventListener("animationend", handleAnimationEnd);
		} else {
			dispatch("ANIMATION_END");
			if (timeoutId !== void 0) ownerWindow?.clearTimeout(timeoutId);
			oldNode?.removeEventListener("animationstart", handleAnimationStart);
			oldNode?.removeEventListener("animationcancel", handleAnimationEnd);
			oldNode?.removeEventListener("animationend", handleAnimationEnd);
		}
	}, { immediate: true });
	const stateWatcher = (0, vue.watch)(state, () => {
		const currentAnimationName = getAnimationName(node.value);
		prevAnimationNameRef.value = state.value === "mounted" ? currentAnimationName : "none";
	});
	(0, vue.onUnmounted)(() => {
		watcher();
		stateWatcher();
	});
	const isPresent = (0, vue.computed)(() => ["mounted", "unmountSuspended"].includes(state.value));
	return { isPresent };
}
function getAnimationName(node) {
	return node ? getComputedStyle(node).animationName || "none" : "none";
}

//#endregion
Object.defineProperty(exports, 'usePresence', {
  enumerable: true,
  get: function () {
    return usePresence;
  }
});
//# sourceMappingURL=usePresence.cjs.map