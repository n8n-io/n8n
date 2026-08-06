import type { WorkflowReviewEligibleReviewer } from '@n8n/api-types';

export function toError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}
