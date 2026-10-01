import { computed, nextTick, onBeforeUnmount, ref, type Ref } from 'vue';

const INITIAL_ROW_COUNT = 10;
const ROW_BATCH_SIZE = 10;

export function useProgressiveRender<T>(
	rows: Readonly<Ref<readonly T[]>>,
	isVisible: Ref<boolean>,
) {
	const scrollAreaRef = ref<HTMLElement>();
	const loadMoreRef = ref<HTMLElement>();
	const renderedRowCount = ref(INITIAL_ROW_COUNT);
	const visibleRows = computed(function getVisibleRows() {
		return rows.value.slice(0, renderedRowCount.value);
	});
	let observer: IntersectionObserver | undefined;

	function stop() {
		observer?.disconnect();
		observer = undefined;
	}

	function loadNextBatch(entries: IntersectionObserverEntry[]) {
		if (
			!entries.some(function isIntersecting(entry) {
				return entry.isIntersecting;
			})
		) {
			return;
		}

		renderedRowCount.value = Math.min(renderedRowCount.value + ROW_BATCH_SIZE, rows.value.length);

		if (renderedRowCount.value >= rows.value.length) {
			stop();
		} else {
			/** Check again because the marker can stay inside the load area after a batch. */
			void nextTick(observe);
		}
	}

	function observe() {
		stop();
		if (
			!isVisible.value ||
			!scrollAreaRef.value ||
			!loadMoreRef.value ||
			renderedRowCount.value >= rows.value.length
		) {
			return;
		}

		observer = new IntersectionObserver(loadNextBatch, {
			root: scrollAreaRef.value,
			/** Load rows before keyboard scrolling reaches the last rendered item. */
			rootMargin: `0px 0px ${scrollAreaRef.value.clientHeight}px 0px`,
		});
		observer.observe(loadMoreRef.value);
	}

	function start() {
		stop();
		renderedRowCount.value = INITIAL_ROW_COUNT;
		void nextTick(observe);
	}

	onBeforeUnmount(stop);

	return {
		loadMoreRef,
		renderedRowCount,
		scrollAreaRef,
		start,
		stop,
		visibleRows,
	};
}
