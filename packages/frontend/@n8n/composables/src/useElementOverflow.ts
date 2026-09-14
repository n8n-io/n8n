import { onBeforeUnmount, onMounted, ref, watch, type Ref, type WatchSource } from 'vue';

export type OverflowAxis = 'x' | 'y';

/**
 * Whether an element's content is clipped along one axis. A table cell uses it to
 * offer a tooltip with the full text only when an ellipsis or a line clamp hides
 * some of it. The check runs on mount, on every resize, and whenever the given
 * sources change, because the content can change without a resize.
 */
export function useElementOverflow(
	element: Ref<HTMLElement | null>,
	axis: OverflowAxis,
	sources: WatchSource[] = [],
) {
	const isOverflowing = ref(false);

	let observer: ResizeObserver | null = null;

	const update = () => {
		const el = element.value;
		if (!el) return;
		isOverflowing.value =
			axis === 'x' ? el.scrollWidth > el.clientWidth : el.scrollHeight > el.clientHeight;
	};

	onMounted(() => {
		update();
		if (element.value && typeof ResizeObserver !== 'undefined') {
			observer = new ResizeObserver(update);
			observer.observe(element.value);
		}
	});

	if (sources.length > 0) {
		watch(sources, update, { flush: 'post' });
	}

	onBeforeUnmount(() => {
		observer?.disconnect();
	});

	return { isOverflowing, update };
}
