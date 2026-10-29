import { onBeforeUnmount, onMounted, ref, watch, type Ref, type WatchSource } from 'vue';

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

	let observer: ResizeObserver | null = null;

	const update = () => {
		const el = element.value;
		if (!el) {
			isOverflowing.value = false;
			return;
		}
		isOverflowing.value =
			axis === 'x' ? el.scrollWidth > el.clientWidth : el.scrollHeight > el.clientHeight;
	};

	const observe = (el: HTMLElement | null) => {
		observer?.disconnect();
		if (el && typeof ResizeObserver !== 'undefined') {
			observer ??= new ResizeObserver(update);
			observer.observe(el);
		}
		update();
	};

	onMounted(() => {
		observe(element.value);
		watch(element, observe, { flush: 'post' });
	});

	if (sources.length > 0) {
		watch(sources, update, { flush: 'post' });
	}

	onBeforeUnmount(() => {
		observer?.disconnect();
	});

	return { isOverflowing, update };
}
