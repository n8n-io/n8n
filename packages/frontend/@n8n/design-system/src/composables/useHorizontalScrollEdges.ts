import { useEventListener, useResizeObserver } from '@vueuse/core';
import { ref, watch, type Ref } from 'vue';

type MaybeElement = HTMLElement | null | undefined;

/**
 * Tracks whether a scroll container still has content hidden past its left or right edge.
 * Re-evaluates on scroll and whenever the container or its content changes size, so the
 * state stays right when columns are resized or the viewport shrinks.
 */
export function useHorizontalScrollEdges(
	container: Ref<MaybeElement>,
	content?: Ref<MaybeElement>,
) {
	const canScrollLeft = ref(false);
	const canScrollRight = ref(false);

	function update() {
		const element = container.value;
		if (!element) {
			canScrollLeft.value = false;
			canScrollRight.value = false;
			return;
		}

		const maxScrollLeft = element.scrollWidth - element.clientWidth;
		canScrollLeft.value = element.scrollLeft > 1;
		canScrollRight.value = maxScrollLeft - element.scrollLeft > 1;
	}

	useEventListener(container, 'scroll', update, { passive: true });
	useResizeObserver(container, update);
	if (content) {
		useResizeObserver(content, update);
	}
	watch(container, update, { flush: 'post' });

	return { canScrollLeft, canScrollRight, update };
}
