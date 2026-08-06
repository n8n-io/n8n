import type { WorkflowReviewEligibleReviewer } from '@n8n/api-types';

export function toError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

export function reviewerFullName(reviewer: WorkflowReviewEligibleReviewer): string | undefined {
	return [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ') || undefined;
}

export function reviewerDisplayName(reviewer: WorkflowReviewEligibleReviewer): string {
	return reviewerFullName(reviewer) ?? reviewer.email;
}
