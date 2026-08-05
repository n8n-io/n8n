import type { WorkflowReviewActivityEntry, WorkflowReviewEligibleReviewer } from '@n8n/api-types';
import type { User, WorkflowReviewActivity, WorkflowReviewActivityComment } from '@n8n/db';

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

/**
 * Total over every activity type the column's CHECK constraint allows: an entry the
 * backend cannot map would either be dropped — making an incomplete feed look complete —
 * or break paging, since the page is sliced before any filter could run.
 *
 * `createdById` is `ON DELETE SET NULL` on both tables, so the author is resolved
 * separately for the header and for each message.
 */
export function toActivityEntry(
	row: WorkflowReviewActivity,
	messages: WorkflowReviewActivityComment[],
	usersById: Map<string, WorkflowReviewEligibleReviewer>,
): WorkflowReviewActivityEntry {
	const createdBy = row.createdById ? (usersById.get(row.createdById) ?? null) : null;
	const base = {
		id: String(row.id),
		typeVersion: row.typeVersion,
		createdBy,
		createdAt: row.createdAt.toISOString(),
	};

	if (row.type === 'comment.created') {
		return {
			...base,
			type: row.type,
			// The thread header carries no detail of its own; the text lives in the messages.
			data: null,
			messages: messages.map((message) => ({
				id: String(message.id),
				body: message.body,
				createdBy: message.createdById ? (usersById.get(message.createdById) ?? null) : null,
				createdAt: message.createdAt.toISOString(),
				updatedAt: message.updatedAt?.toISOString() ?? null,
				deletedAt: message.deletedAt?.toISOString() ?? null,
			})),
		};
	}

	return { ...base, type: row.type, data: row.data };
}
