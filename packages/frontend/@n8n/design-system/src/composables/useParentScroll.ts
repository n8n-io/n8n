import { ref, onBeforeUnmount, nextTick, type Ref } from 'vue';

type ScrollListener = {
	element: Element;
	handler: () => void;
};

const isHTMLElement = (element: unknown): element is HTMLElement => {
	return element !== undefined && element instanceof HTMLElement;
};

const isScrollable = (element: Element): boolean => {
	const computedStyle = window.getComputedStyle(element);
	const overflowY = computedStyle.overflowY;
	const overflowX = computedStyle.overflowX;

	// Check if element has scrollable overflow
	const hasScrollableOverflow =
		overflowY === 'auto' ||
		overflowY === 'scroll' ||
		overflowX === 'auto' ||
		overflowX === 'scroll';

	if (!hasScrollableOverflow) {
		return false;
	}

	// Check if element actually has scrollable content
	return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
};

const findFirstScrollableParent = (element: HTMLElement): Element | null => {
	let parent = element.parentElement;

	while (parent && parent !== document.body) {
		if (isScrollable(parent)) {
			return parent;
		}
		parent = parent.parentElement;
	}

	if (document.body && isScrollable(document.body)) {
		return document.body;
	}

	if (document.documentElement && isScrollable(document.documentElement)) {
		return document.documentElement;
	}

	return null;
};

/**
 * Detects scroll events on parent elements and triggers a callback
 *
 * @param elementRef - Ref to the element or component instance with $el
 * @param onScroll - Callback function to execute when scroll is detected
 */
export function useParentScroll(
	elementRef: Ref<{ $el?: unknown } | HTMLElement | null | undefined>,
	onScroll: () => void,
) {
	const scrollListeners = ref<ScrollListener[]>([]);

	const detachScrollListeners = () => {
		scrollListeners.value.forEach(({ element, handler }) => {
			element.removeEventListener('scroll', handler, { capture: true });
		});
		scrollListeners.value = [];
	};

	const attachScrollListeners = () => {
		// Ensure DOM is ready but don't block on it
		void nextTick(() => {
			const element = elementRef.value;
			const dropdownElement = element && '$el' in element ? element.$el : element;

			if (!isHTMLElement(dropdownElement)) {
				return;
			}

			detachScrollListeners();

			const scrollableParent = findFirstScrollableParent(dropdownElement);

			if (scrollableParent) {
				const handler = () => onScroll();
				scrollableParent.addEventListener('scroll', handler, { passive: true, capture: true });
				scrollListeners.value.push({ element: scrollableParent, handler });
			}
		});
	};

	onBeforeUnmount(() => {
		detachScrollListeners();
	});

	return {
		attachScrollListeners,
		detachScrollListeners,
	};
}
