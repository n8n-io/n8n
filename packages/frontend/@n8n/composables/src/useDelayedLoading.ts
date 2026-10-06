import { useTimeoutFn } from '@vueuse/core';
import { readonly, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue';

/** Wait before showing a skeleton for a pending request. */
export const SKELETON_DELAY = 300;

/** Delay loading feedback without delaying the request state or its result. */
export function useDelayedLoading(
	loading: MaybeRefOrGetter<boolean>,
	delay: MaybeRefOrGetter<number> = SKELETON_DELAY,
) {
	const revealed = shallowRef(false);
	const { start, stop } = useTimeoutFn(
		() => {
			revealed.value = toValue(loading);
		},
		delay,
		{ immediate: false },
	);

	watch(
		[() => toValue(loading), () => toValue(delay)],
		([isLoading, duration]) => {
			stop();
			revealed.value = isLoading && duration <= 0;
			if (isLoading && duration > 0) start();
		},
		{ immediate: true, flush: 'sync' },
	);

	return readonly(revealed);
}
