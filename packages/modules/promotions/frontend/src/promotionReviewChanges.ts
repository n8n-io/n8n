import type { PromotionReviewChanges } from '@n8n/api-types';

/**
 * The changes that the Changes tab of a review loaded. The Issues tab reads them, so the two tabs
 * show one answer of the server: the count and the list agree, and both describe the head commit
 * that the reviewer approves. The inbox shows one review at a time, so one entry is sufficient.
 */
let loaded: { reviewId: string; changes: PromotionReviewChanges } | null = null;

export function setLoadedReviewChanges(reviewId: string, changes: PromotionReviewChanges) {
	loaded = { reviewId, changes };
}

/** The Changes tab calls this before each load and when it goes away, so no old answer stays. */
export function clearLoadedReviewChanges() {
	loaded = null;
}

export function getLoadedReviewChanges(reviewId: string): PromotionReviewChanges | undefined {
	return loaded?.reviewId === reviewId ? loaded.changes : undefined;
}
