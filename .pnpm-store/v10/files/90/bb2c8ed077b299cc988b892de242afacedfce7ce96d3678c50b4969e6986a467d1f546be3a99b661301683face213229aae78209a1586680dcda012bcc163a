import { useStateMachine } from "../shared/useStateMachine.js";
import { computed, nextTick, onUnmounted, ref, watch } from "vue";
import { defaultWindow } from "@vueuse/core";
import { isClient } from "@vueuse/shared";

//#region src/Presence/usePresence.ts
function usePresence(present, node) {
	const stylesRef = ref({});
	const prevAnimationNameRef = ref("none");
	const prevPresentRef = ref(present);
	const initialState = present.value ? "mounted" : "unmounted";
	let timeoutId;
	const ownerWindow = node.value?.ownerDocument.defaultView ?? defaultWindow;
	const { state, dispatch } = useStateMachine(initialState, {
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
		if (isClient) {
			const customEvent = new CustomEvent(name, {
				bubbles: false,
				cancelable: false
			});
			node.value?.dispatchEvent(customEvent);
		}
	};
	watch(present, async (currentPresent, prevPresent) => {
		const hasPresentChanged = prevPresent !== currentPresent;
		await nextTick();
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
	const watcher = watch(node, (newNode, oldNode) => {
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
	const stateWatcher = watch(state, () => {
		const currentAnimationName = getAnimationName(node.value);
		prevAnimationNameRef.value = state.value === "mounted" ? currentAnimationName : "none";
	});
	onUnmounted(() => {
		watcher();
		stateWatcher();
	});
	const isPresent = computed(() => ["mounted", "unmountSuspended"].includes(state.value));
	return { isPresent };
}
function getAnimationName(node) {
	return node ? getComputedStyle(node).animationName || "none" : "none";
}

//#endregion
export { usePresence };
//# sourceMappingURL=usePresence.js.map