import {
	workflowReviewClosedActivityDataSchema,
	workflowReviewDecisionActivityDataSchema,
	workflowReviewOpenedActivityDataSchema,
	workflowReviewVersionUpdatedActivityDataSchema,
	workflowReviewWorkflowCauseActivityDataSchema,
	workflowReviewWorkflowPublishedActivityDataSchema,
	type WorkflowReviewActivityEntry,
	type WorkflowReviewEligibleReviewer,
	type WorkflowReviewRequestSummary,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type {
	User,
	WorkflowReviewActivity,
	WorkflowReviewActivityComment,
	WorkflowReviewRequest,
} from '@n8n/db';
import type { z } from 'zod';

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
 * The minimal review summary every mutation response is built from — create,
 * update-version, and decide share it so id, state, decision, pin, and
 * timestamp serialization cannot drift apart.
 */
export function toRequestSummary(
	request: WorkflowReviewRequest,
	workflowVersionId: string | null,
): WorkflowReviewRequestSummary {
	return {
		id: request.id,
		state: request.state,
		decision: request.decision,
		workflowVersionId,
		createdAt: request.createdAt.toISOString(),
		updatedAt: request.updatedAt.toISOString(),
	};
}

/**
 * A stored payload the schema rejects becomes `null` rather than an exception: one bad row must
 * not take down the whole feed page.
 */
function parsePayload<T>(
	schema: z.ZodType<T>,
	row: WorkflowReviewActivity,
	logger: Logger,
): T | null {
	// These schemas describe typeVersion 1 only; a later version gets its own schema and case.
	if (row.typeVersion === 1) {
		const parsed = schema.safeParse(row.data);
		if (parsed.success) {
			return parsed.data;
		}
	}

	logger.warn('Failed to parse workflow review activity payload', {
		activityId: row.id,
		type: row.type,
		typeVersion: row.typeVersion,
	});
	return null;
}

export function toActivityEntry(
	row: WorkflowReviewActivity,
	messages: WorkflowReviewActivityComment[],
	usersById: Map<string, WorkflowReviewEligibleReviewer>,
	logger: Logger,
): WorkflowReviewActivityEntry {
	const createdBy = row.createdById ? (usersById.get(row.createdById) ?? null) : null;
	const base = {
		id: String(row.id),
		typeVersion: row.typeVersion,
		createdBy,
		createdAt: row.createdAt.toISOString(),
	};

	switch (row.type) {
		case 'comment.created':
			return {
				...base,
				type: row.type,
				data: null,
				messages: messages.map((message) => ({
					id: String(message.id),
					// Never send the body of a deleted comment, even if the row still holds one, so a
					// delete path that only sets `deletedAt` cannot leak it.
					body: message.deletedAt ? null : message.body,
					createdBy: message.createdById ? (usersById.get(message.createdById) ?? null) : null,
					createdAt: message.createdAt.toISOString(),
					updatedAt: message.updatedAt?.toISOString() ?? null,
					deletedAt: message.deletedAt?.toISOString() ?? null,
				})),
			};
		case 'review.opened':
			return {
				...base,
				type: row.type,
				data: parsePayload(workflowReviewOpenedActivityDataSchema, row, logger),
			};
		case 'review.changes_requested':
		case 'review.approved':
			return {
				...base,
				type: row.type,
				data: parsePayload(workflowReviewDecisionActivityDataSchema, row, logger),
			};
		case 'review.version_updated':
			return {
				...base,
				type: row.type,
				data: parsePayload(workflowReviewVersionUpdatedActivityDataSchema, row, logger),
			};
		case 'review.closed':
			return {
				...base,
				type: row.type,
				data: parsePayload(workflowReviewClosedActivityDataSchema, row, logger),
			};
		case 'workflow.archived':
		case 'workflow.deleted':
		case 'workflow.moved':
			return {
				...base,
				type: row.type,
				data: parsePayload(workflowReviewWorkflowCauseActivityDataSchema, row, logger),
			};
		case 'workflow.published':
			return {
				...base,
				type: row.type,
				data: parsePayload(workflowReviewWorkflowPublishedActivityDataSchema, row, logger),
			};
	}

	// Unreachable per the union; a row whose type is outside it (e.g. after a version
	// downgrade) must still render as an unknown entry rather than crash the feed.
	return { ...base, type: row.type, data: null };
}
