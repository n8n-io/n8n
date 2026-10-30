const SCROLLABLE_OVERFLOW = /(auto|scroll|overlay)/;

/**
 * Returns the nearest ancestor that scrolls vertically, or the document scroller.
 */
export function getScrollParent(element: HTMLElement | null): HTMLElement | null {
	let parent = element?.parentElement ?? null;

	while (parent) {
		if (SCROLLABLE_OVERFLOW.test(getComputedStyle(parent).overflowY)) {
			return parent;
		}
		parent = parent.parentElement;
	}

	return (document.scrollingElement as HTMLElement | null) ?? null;
}
