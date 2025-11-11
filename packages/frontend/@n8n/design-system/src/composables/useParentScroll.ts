import { getOverflowAncestors } from '@floating-ui/dom';
import { ref, onBeforeUnmount, nextTick, type Ref } from 'vue';

interface ScrollListener {
	element: Element;
	handler: () => void;
}

const isHTMLElement = (element: unknown): element is HTMLElement => {
	return element !== undefined && element instanceof HTMLElement;
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

			// Get all scrollable ancestors and attach listeners
			const scrollableParents = getOverflowAncestors(dropdownElement);

			scrollableParents.forEach((parent) => {
				if (parent instanceof Element) {
					const handler = () => onScroll();
					parent.addEventListener('scroll', handler, { passive: true, capture: true });
					scrollListeners.value.push({ element: parent, handler });
				}
			});

			// Also listen to window scroll
			const windowHandler = () => onScroll();
			window.addEventListener('scroll', windowHandler, { passive: true, capture: true });
			scrollListeners.value.push({ element: window as unknown as Element, handler: windowHandler });
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
