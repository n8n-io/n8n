import { PLAYGROUND_REVIEW_ID, startReviewMock } from './playground.review-mock';
import { isPlaygroundSize, DEFAULT_PLAYGROUND_SIZE } from './playground.scenarios';

/**
 * Development only. The review scenario shows the real Inbox in a frame of the Playground. The
 * Inbox is tied to its own route, so it cannot render inside another page. The frame loads the
 * Inbox with `?playground=review`, and this code then gives that page the sample data and hides
 * the app sidebar, so that only the Inbox shows in the frame.
 */
export const PLAYGROUND_EMBED_PARAM = 'playground';
export const PLAYGROUND_REVIEW_EMBED = 'review';

/** The address that the frame of the review scenario loads. */
export const reviewFrameUrl = (size: string) =>
	`/inbox/promotion-reviews/${PLAYGROUND_REVIEW_ID}?${PLAYGROUND_EMBED_PARAM}=${PLAYGROUND_REVIEW_EMBED}&size=${size}`;

export function bootEmbeddedReview() {
	if (typeof window === 'undefined') return;
	const params = new URLSearchParams(window.location.search);
	if (params.get(PLAYGROUND_EMBED_PARAM) !== PLAYGROUND_REVIEW_EMBED) return;

	const size = params.get('size');
	startReviewMock({
		size: isPlaygroundSize(size) ? size : DEFAULT_PLAYGROUND_SIZE,
		project: { id: 'playground-project', name: 'Sales' },
	});

	// The shell of the app. The Inbox page is the content of the frame.
	const style = document.createElement('style');
	style.textContent = '#sidebar, #banners, #header { display: none !important; }';
	document.head.append(style);
}
