import { onBeforeUnmount, onMounted, type Ref } from 'vue';

/**
 * Lets the focus move into an element that sits outside an open dialog.
 * A dialog takes the focus back when it sees the focus leave. While the element is mounted,
 * the dialog does not see a move of the focus into the element.
 */
export function useFocusEntry(element: Ref<HTMLElement | null>): void {
	function isMoveIntoElement(event: FocusEvent): boolean {
		return (
			event.relatedTarget instanceof Node && element.value?.contains(event.relatedTarget) === true
		);
	}

	function hideMoveIntoElement(event: FocusEvent): void {
		if (isMoveIntoElement(event)) {
			event.stopPropagation();
		}
	}

	// The capture phase runs before the listener of the dialog on the document.
	onMounted(() => document.addEventListener('focusout', hideMoveIntoElement, true));
	onBeforeUnmount(() => document.removeEventListener('focusout', hideMoveIntoElement, true));
}
