import type { ScrollAnchorSnapshot } from './ChatScrollArea.types';

/** Distance in px from the bottom that still counts as "at the bottom". */
export const AT_BOTTOM_THRESHOLD_PX = 32;

/** Distance in px above the top that starts a `load-older` request. */
export const LOAD_OLDER_ROOT_MARGIN = '200px 0px 0px 0px';

/**
 * Returns the scroll position that keeps the visible content in place
 * after content was added above it.
 */
export function getAnchoredScrollTop(
	snapshot: ScrollAnchorSnapshot,
	currentScrollHeight: number,
): number {
	return snapshot.scrollTop + (currentScrollHeight - snapshot.scrollHeight);
}

/** Takes a snapshot of the scroll position of an element. */
export function takeScrollSnapshot(element: HTMLElement): ScrollAnchorSnapshot {
	return { scrollHeight: element.scrollHeight, scrollTop: element.scrollTop };
}

/** Scrolls an element to the bottom. */
export function scrollToBottom(element: HTMLElement, behavior: ScrollBehavior = 'auto') {
	element.scrollTo({ top: element.scrollHeight, behavior });
}
