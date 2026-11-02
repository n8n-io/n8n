import { useEventListener, useResizeObserver } from '@vueuse/core';
import { ref, watch, type Ref } from 'vue';

type MaybeElement = HTMLElement | null | undefined;

export function useHorizontalScrollEdges(
	container: Ref<MaybeElement>,
	content: Ref<MaybeElement> = ref(null),
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

		// Ignore a sub-pixel remainder so the edge hint does not flicker.
		canScrollLeft.value = element.scrollLeft > 1;
		canScrollRight.value = element.scrollWidth - element.clientWidth - element.scrollLeft > 1;
	}

	useEventListener(container, 'scroll', update, { passive: true });
	useResizeObserver(container, update);
	useResizeObserver(content, update);
	watch(container, update, { flush: 'post' });

	return { canScrollLeft, canScrollRight };
}
