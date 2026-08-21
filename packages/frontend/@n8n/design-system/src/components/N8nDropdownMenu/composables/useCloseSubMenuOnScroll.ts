import { nextTick, onBeforeUnmount } from 'vue';

interface CloseSubMenuOnScrollOptions {
	getScrollContainer: () => HTMLElement | null;
	getItem: (index: number) => HTMLElement | null;
	onItemHidden: (index: number) => void;
}

/**
 * Closes an open submenu after its parent item leaves the menu scrollport.
 * This stops sub-menus floating next to their hidden menu items and looking weird.
 */
export function useCloseSubMenuOnScroll(options: CloseSubMenuOnScrollOptions) {
	let observer: IntersectionObserver | undefined;
	let observationSequence = 0;

	function stopObserving() {
		observationSequence++;
		observer?.disconnect();
		observer = undefined;
	}

	async function observe(index: number) {
		stopObserving();
		const sequence = observationSequence;
		await nextTick();

		if (sequence !== observationSequence) return;

		const scrollContainer = options.getScrollContainer();
		const item = options.getItem(index);
		if (!scrollContainer || !item) return;

		observer = new IntersectionObserver(
			function handleIntersection(entries) {
				const entry = entries[0];
				if (!entry || entry.isIntersecting) return;

				stopObserving();
				options.onItemHidden(index);
			},
			{
				root: scrollContainer,
				threshold: 0,
			},
		);
		observer.observe(item);
	}

	onBeforeUnmount(stopObserving);

	return { observe, stopObserving };
}
