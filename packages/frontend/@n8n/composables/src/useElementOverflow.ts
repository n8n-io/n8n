import { useResizeObserver } from '@vueuse/core';
import { ref, watch, type Ref, type WatchSource } from 'vue';

export type OverflowAxis = 'x' | 'y';

/**
 * Whether the content is clipped along one axis. Re-checks on resize and when `sources` change.
 * The element may mount later or be swapped (`v-if`): the observer follows the ref.
 */
export function useElementOverflow(
	element: Ref<HTMLElement | null>,
	axis: OverflowAxis,
	sources: WatchSource[] = [],
) {
	const isOverflowing = ref(false);

	const update = () => {
		const el = element.value;
		if (!el) {
			isOverflowing.value = false;
			return;
		}
		isOverflowing.value =
			axis === 'x' ? el.scrollWidth > el.clientWidth : el.scrollHeight > el.clientHeight;
	};

	useResizeObserver(element, update);
	// The observer only reports the element it watches: a swap or a removal is checked here.
	watch([element, ...sources], update, { flush: 'post' });

	return { isOverflowing, update };
}
