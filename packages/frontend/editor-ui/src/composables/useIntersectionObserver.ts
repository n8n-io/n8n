import { ref, onBeforeUnmount, type Ref } from 'vue';

export interface UseIntersectionObserverOptions {
	/**
	 * The root element for intersection detection (scrollable container)
	 */
	root: Ref<Element | null>;

	/**
	 * Threshold for intersection (0.0 to 1.0)
	 * @default 0.01
	 */
	threshold?: number;

	/**
	 * Callback to execute when element intersects
	 */
	onIntersect: () => void;

	/**
	 * Whether to disconnect observer after first intersection
	 * @default true
	 */
	once?: boolean;
}

/**
 * Composable for observing element intersections with automatic cleanup
 *
 * @example
 * const { observe } = useIntersectionObserver({
 *   root: containerRef,
 *   onIntersect: () => loadMore(),
 * });
 *
 * // Observe last item in list
 * observe(lastItemElement);
 */
export function useIntersectionObserver(options: UseIntersectionObserverOptions) {
	const observer = ref<IntersectionObserver | null>(null);

	/**
	 * Stop observing and clean up the observer
	 */
	const disconnect = () => {
		if (observer.value) {
			observer.value.disconnect();
			observer.value = null;
		}
	};

	/**
	 * Start observing an element for intersection
	 * Automatically cleans up any existing observer before creating a new one
	 */
	const observe = (element: Element | null | undefined) => {
		if (!element) return;

		// Clean up existing observer if any
		disconnect();

		observer.value = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					options.onIntersect();

					if (options.once !== false) {
						disconnect();
					}
				}
			},
			{
				root: options.root.value,
				threshold: options.threshold ?? 0.01,
			},
		);

		observer.value.observe(element);
	};

	// Cleanup observer when component unmounts
	onBeforeUnmount(() => {
		disconnect();
	});

	return {
		observer,
		observe,
		disconnect,
	};
}
