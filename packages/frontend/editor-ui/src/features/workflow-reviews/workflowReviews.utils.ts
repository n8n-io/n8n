import type { WorkflowReviewEligibleReviewer } from '@n8n/api-types';

export function toError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

/** The reviewer's full name, or `undefined` when we only know their email. */
export function reviewerFullName(reviewer: WorkflowReviewEligibleReviewer): string | undefined {
	return [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ') || undefined;
}

/** How a reviewer is labelled in review surfaces: their name, falling back to their email. */
export function reviewerDisplayName(reviewer: WorkflowReviewEligibleReviewer): string {
	return reviewerFullName(reviewer) ?? reviewer.email;
}
