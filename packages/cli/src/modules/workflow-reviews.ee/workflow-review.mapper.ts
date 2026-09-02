import type { WorkflowReviewEligibleReviewer } from '@n8n/api-types';
import type { User } from '@n8n/db';

/**
 * Project a user onto the boundary shape the review endpoints are allowed to expose.
 * Shared by every review response that carries users, so the eligible-reviewer,
 * inbox and detail payloads cannot drift apart.
 */
export function toEligibleReviewer(user: User): WorkflowReviewEligibleReviewer {
	return {
		id: user.id,
		email: user.email,
		firstName: user.firstName ?? null,
		lastName: user.lastName ?? null,
	};
}
