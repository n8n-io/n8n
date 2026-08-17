import { z } from 'zod';

import type { Iso8601DateTimeString } from './datetime';
import type { WorkflowReviewEligibleReviewer } from './workflow-review-eligible-reviewer';

/**
 * Feed entry kinds, named `<model>.<event>`: a dot separates model from event, snake_case within a
 * multi-word event. Mirrored by a CHECK constraint on `workflow_review_activity.type`, so a new
 * kind needs a migration.
 *
 * Here rather than on the entity because it is a wire type: the frontend switches on these
 * values to pick a renderer.
 */
export type WorkflowReviewActivityType =
	| 'review.opened'
	| 'comment.created'
	| 'review.changes_requested'
	| 'review.version_updated'
	| 'review.approved'
	| 'workflow.published'
	/** Closed without an approval: workflow archived or deleted, or the review abandoned. An
	 * approval writes `review.approved` instead, never both. */
	| 'review.closed';

// These are the typeVersion 1 shapes. A typeVersion 2 gets its own schema, its own
// union member and its own mapper case; never widen one of these in place.
const workflowReviewClosedReasonSchema = z.enum([
	'workflow-archived',
	'workflow-moved',
	'workflow-deleted',
]);
export type WorkflowReviewClosedReason = z.infer<typeof workflowReviewClosedReasonSchema>;

/**
 * Pairs the version with its workflow: the entry is the immutable record, and the live pin it was
 * built from is prunable, so a bare version id becomes unresolvable once pruning removes the
 * history row.
 */
const workflowReviewActivityWorkflowVersionSchema = z.object({
	workflowId: z.string(),
	workflowVersionId: z.string(),
});
export const workflowReviewOpenedActivityDataSchema = z.object({
	workflowVersions: z.array(workflowReviewActivityWorkflowVersionSchema),
});
export type WorkflowReviewOpenedActivityData = z.infer<
	typeof workflowReviewOpenedActivityDataSchema
>;

export const workflowReviewDecisionActivityDataSchema = z.object({
	workflowVersions: z.array(workflowReviewActivityWorkflowVersionSchema),
	note: z.string().nullable(),
});
export type WorkflowReviewDecisionActivityData = z.infer<
	typeof workflowReviewDecisionActivityDataSchema
>;

export const workflowReviewVersionUpdatedActivityDataSchema = z.object({
	/**
	 * Here rather than in the entity's `workflowId` column: that column's FK cascades, so a
	 * workflow delete would silently take these entries out of an append-only feed.
	 */
	workflowId: z.string(),
	fromWorkflowVersionId: z.string().nullable(),
	toWorkflowVersionId: z.string().nullable(),
});
export type WorkflowReviewVersionUpdatedActivityData = z.infer<
	typeof workflowReviewVersionUpdatedActivityDataSchema
>;

export const workflowReviewClosedActivityDataSchema = z.object({
	reason: workflowReviewClosedReasonSchema,
});
export type WorkflowReviewClosedActivityData = z.infer<
	typeof workflowReviewClosedActivityDataSchema
>;

type WorkflowReviewActivityBase = {
	/** Int in the database, string on the wire. */
	id: string;
	typeVersion: number;
	/** `null` once the author is deleted. */
	createdBy: WorkflowReviewEligibleReviewer | null;
	createdAt: Iso8601DateTimeString;
};

export type WorkflowReviewActivityMessage = {
	id: string;
	/** `null` once the message is deleted (LIGO-609). */
	body: string | null;
	createdBy: WorkflowReviewEligibleReviewer | null;
	createdAt: Iso8601DateTimeString;
	updatedAt: Iso8601DateTimeString | null;
	deletedAt: Iso8601DateTimeString | null;
};

/**
 * Total over every type the CHECK constraint allows, so no stored row is ever unmappable.
 * `data: null` on a non-comment entry means the stored payload did not parse; the renderer
 * degrades rather than dropping the entry.
 */
export type WorkflowReviewActivityEntry =
	| (WorkflowReviewActivityBase & {
			type: 'comment.created';
			data: null;
			messages: WorkflowReviewActivityMessage[];
	  })
	| (WorkflowReviewActivityBase & {
			type: 'review.opened';
			data: WorkflowReviewOpenedActivityData | null;
	  })
	| (WorkflowReviewActivityBase & {
			type: 'review.changes_requested' | 'review.approved';
			data: WorkflowReviewDecisionActivityData | null;
	  })
	| (WorkflowReviewActivityBase & {
			type: 'review.version_updated';
			data: WorkflowReviewVersionUpdatedActivityData | null;
	  })
	| (WorkflowReviewActivityBase & {
			type: 'review.closed';
			data: WorkflowReviewClosedActivityData | null;
	  })
	| (WorkflowReviewActivityBase & {
			type: 'workflow.published';
			data: null;
	  });
