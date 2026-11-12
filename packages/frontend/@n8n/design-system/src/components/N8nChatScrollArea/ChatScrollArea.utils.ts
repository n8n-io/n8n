import type { ScrollAnchorSnapshot } from './ChatScrollArea.types';

/** Distance in px from the bottom that still counts as "at the bottom". */
export const AT_BOTTOM_THRESHOLD_PX = 32;

/** Distance in px from the top that starts a `load-older` request. */
export const LOAD_OLDER_THRESHOLD_PX = 200;

export const LOAD_OLDER_ROOT_MARGIN = `${LOAD_OLDER_THRESHOLD_PX}px 0px 0px 0px`;

/** Returns `true` when the top of the content is near the top of the view. */
export function isNearTop(element: HTMLElement): boolean {
	return element.scrollTop <= LOAD_OLDER_THRESHOLD_PX;
}

/**
 * Finds the content element at the top edge of the view. Content added above
 * it moves it down. Content added below it does not move it.
 */
function findAnchor(viewport: HTMLElement, content: HTMLElement): Element | undefined {
	if (typeof document.elementFromPoint !== 'function') return undefined;
	const rect = viewport.getBoundingClientRect();
	const element = document.elementFromPoint(rect.left + rect.width / 2, rect.top + 1);
	return element && content.contains(element) ? element : undefined;
}

/** Takes a snapshot of the scroll position and of the element at the top of the view. */
export function takeScrollSnapshot(
	viewport: HTMLElement,
	content: HTMLElement,
): ScrollAnchorSnapshot {
	const anchor = findAnchor(viewport, content);
	return {
		scrollHeight: viewport.scrollHeight,
		scrollTop: viewport.scrollTop,
		anchor,
		anchorTop: anchor?.getBoundingClientRect().top,
	};
}

/**
 * Returns the scroll position that keeps the visible content in place after
 * content was added above it. Uses the anchor element, so content that grows
 * below the view (for example, a streamed reply) does not move the view.
 * Uses the change in height when the anchor is not available.
 */
export function getAnchoredScrollTop(
	snapshot: ScrollAnchorSnapshot,
	viewport: HTMLElement,
): number {
	const { anchor, anchorTop } = snapshot;
	if (anchor?.isConnected && anchorTop !== undefined) {
		return viewport.scrollTop + (anchor.getBoundingClientRect().top - anchorTop);
	}
	return snapshot.scrollTop + (viewport.scrollHeight - snapshot.scrollHeight);
}

/** Scrolls an element to the bottom. */
export function scrollToBottom(element: HTMLElement, behavior: ScrollBehavior = 'auto') {
	element.scrollTo({ top: element.scrollHeight, behavior });
}
