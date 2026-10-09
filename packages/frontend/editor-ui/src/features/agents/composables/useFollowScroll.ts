import { useEventListener } from '@vueuse/core';
import { nextTick, ref, watch, type Ref, type WatchSource } from 'vue';

/**
 * How close to the end the user must be for new output to keep following.
 * The same distance as the agent chat, so a small layout change does not
 * count as a scroll up.
 */
export const FOLLOW_SCROLL_THRESHOLD_PX = 80;

export interface ScrollMetrics {
	scrollTop: number;
	scrollHeight: number;
	clientHeight: number;
}

export function isNearScrollEnd(
	{ scrollTop, scrollHeight, clientHeight }: ScrollMetrics,
	threshold = FOLLOW_SCROLL_THRESHOLD_PX,
): boolean {
	return scrollHeight - scrollTop - clientHeight <= threshold;
}

/**
 * Keeps a scrollable output (logs, command output) at its end. The element
 * opens at the end and follows new content. When the user scrolls up, it
 * stops following until they scroll back to the end or call `followEnd`.
 */
export function useFollowScroll(target: Ref<HTMLElement | undefined>, content: WatchSource) {
	const following = ref(true);

	function scrollToEnd() {
		const element = target.value;
		if (element) element.scrollTop = element.scrollHeight;
	}

	async function followEnd() {
		following.value = true;
		await nextTick();
		scrollToEnd();
	}

	useEventListener(
		target,
		'scroll',
		() => {
			if (target.value) following.value = isNearScrollEnd(target.value);
		},
		{ passive: true },
	);

	// A new element (for example, a panel that opens again) starts at the end.
	watch(
		target,
		(element) => {
			if (element) void followEnd();
		},
		{ immediate: true, flush: 'post' },
	);
	watch(
		content,
		() => {
			if (following.value) scrollToEnd();
		},
		{ flush: 'post' },
	);

	return { following, followEnd };
}
