import {
	unrefElement,
	useEventListener,
	useMutationObserver,
	useResizeObserver,
	type MaybeComputedElementRef,
} from '@vueuse/core';
import { computed, ref, watch, type Ref } from 'vue';

/** Ignore a sub-pixel remainder so the edge hint does not flicker. */
const SCROLL_EDGE_THRESHOLD = 1;

export type ScrollEdgesAxis = 'horizontal' | 'vertical';

export type UseScrollEdgesOptions = {
	/**
	 * `horizontal` measures left and right.
	 * `vertical` measures top and bottom.
	 */
	axis: ScrollEdgesAxis;
	/**
	 * Child whose size changes without a scroll event.
	 * The data table passes its table element so a column resize updates the hints.
	 */
	content?: MaybeComputedElementRef;
};

export type HorizontalScrollEdges = {
	/** True after the scroller moves right, so content is hidden on the left. */
	canScrollLeft: Ref<boolean>;
	/** True while content remains past the right edge. */
	canScrollRight: Ref<boolean>;
};

export type VerticalScrollEdges = {
	/** True after the scroller moves down, so content is hidden above. */
	canScrollTop: Ref<boolean>;
	/** True while content remains below the bottom edge. */
	canScrollBottom: Ref<boolean>;
};

function resolveElement(target: MaybeComputedElementRef | undefined): HTMLElement | null {
	if (!target) return null;

	const element = unrefElement(target);
	return element instanceof HTMLElement ? element : null;
}

function hasHiddenContent(position: number, scrollSize: number, clientSize: number): boolean {
	return scrollSize - clientSize - position > SCROLL_EDGE_THRESHOLD;
}

export function useScrollEdges(
	container: MaybeComputedElementRef,
	options: { axis: 'horizontal'; content?: MaybeComputedElementRef },
): HorizontalScrollEdges;

export function useScrollEdges(
	container: MaybeComputedElementRef,
	options: { axis: 'vertical'; content?: MaybeComputedElementRef },
): VerticalScrollEdges;

export function useScrollEdges(
	container: MaybeComputedElementRef,
	options: UseScrollEdgesOptions,
): HorizontalScrollEdges | VerticalScrollEdges {
	const element = computed(() => resolveElement(container));
	const contentElement = computed(() => resolveElement(options.content));
	const canScrollStart = ref(false);
	const canScrollEnd = ref(false);

	function update() {
		const scroller = element.value;
		if (!scroller) {
			canScrollStart.value = false;
			canScrollEnd.value = false;
			return;
		}

		if (options.axis === 'horizontal') {
			canScrollStart.value = scroller.scrollLeft > SCROLL_EDGE_THRESHOLD;
			canScrollEnd.value = hasHiddenContent(
				scroller.scrollLeft,
				scroller.scrollWidth,
				scroller.clientWidth,
			);
			return;
		}

		canScrollStart.value = scroller.scrollTop > SCROLL_EDGE_THRESHOLD;
		canScrollEnd.value = hasHiddenContent(
			scroller.scrollTop,
			scroller.scrollHeight,
			scroller.clientHeight,
		);
	}

	useEventListener(element, 'scroll', update, { passive: true });
	useResizeObserver(element, update);
	useResizeObserver(contentElement, update);
	// Item lists grow inside a fixed frame, so a resize of the frame never fires.
	useMutationObserver(element, update, { childList: true, subtree: true, attributes: true });
	watch([element, contentElement], update, { flush: 'post', immediate: true });

	if (options.axis === 'horizontal') {
		return { canScrollLeft: canScrollStart, canScrollRight: canScrollEnd };
	}

	return { canScrollTop: canScrollStart, canScrollBottom: canScrollEnd };
}
