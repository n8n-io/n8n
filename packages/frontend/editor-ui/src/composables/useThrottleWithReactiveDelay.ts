import { useThrottleFn } from '@vueuse/core';
import { shallowRef, watch, type Ref } from 'vue';

/**
 * Similar to `useThrottle` from @vueuse/core, but with changeable delay
 */
export function useThrottleWithReactiveDelay<T>(state: Ref<T>, delay: Ref<number>) {
	const throttled = shallowRef(state.value);

	watch(
		state,
		useThrottleFn((latest) => (throttled.value = latest), delay, true, true),
		{ immediate: true },
	);

	return throttled;
}
