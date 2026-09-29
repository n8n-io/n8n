import { z } from 'zod';

import type { Iso8601DateTimeString } from './datetime';
import type { WorkflowReviewEligibleReviewer } from './workflow-review-eligible-reviewer';

export type WorkflowReviewWorkflowCauseActivityType =
	| 'workflow.archived'
	| 'workflow.deleted'
	| 'workflow.moved';

/**
 * Feed entry kinds, named `<model>.<event>`. Constrained only here and at the write sites — the
 * database intentionally has no CHECK on `type`, so growing this union needs no migration.
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
	| WorkflowReviewWorkflowCauseActivityType
	| 'workflow.published'
	/** Closed without an approval. An approval writes `review.approved` instead, never both. */
	| 'review.closed';

// These are the typeVersion 1 shapes. A typeVersion 2 gets its own schema, its own
// union member and its own mapper case; never widen one of these in place.
const workflowReviewClosedReasonSchema = z.enum(['no-reviewable-workflows']);
export type WorkflowReviewClosedReason = z.infer<typeof workflowReviewClosedReasonSchema>;

/**
 * Immutable record of who acted, because `createdById` alone cannot say: it is also `null` once a
 * user is deleted, and a deleted user's action must still render as a person's, not the system's.
 */
const workflowReviewActivityActorKindSchema = z.enum(['user', 'system']);
export type WorkflowReviewActivityActorKind = z.infer<typeof workflowReviewActivityActorKindSchema>;

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

/**
 * A cause event: what happened to a linked workflow. The id lives here rather than in a column
 * because the entity's FKs cascade.
 */
export const workflowReviewWorkflowCauseActivityDataSchema = z.object({
	workflowId: z.string(),
	actorKind: workflowReviewActivityActorKindSchema,
});
export type WorkflowReviewWorkflowCauseActivityData = z.infer<
	typeof workflowReviewWorkflowCauseActivityDataSchema
>;

export const workflowReviewWorkflowPublishedActivityDataSchema = z.object({
	workflowId: z.string(),
	workflowVersionId: z.string(),
});
export type WorkflowReviewWorkflowPublishedActivityData = z.infer<
	typeof workflowReviewWorkflowPublishedActivityDataSchema
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
 * Total over every type in {@link WorkflowReviewActivityType}, so no stored row is ever
 * unmappable. `data: null` on a non-comment entry means the stored payload did not parse; the
 * renderer degrades rather than dropping the entry.
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
			type: WorkflowReviewWorkflowCauseActivityType;
			data: WorkflowReviewWorkflowCauseActivityData | null;
	  })
	| (WorkflowReviewActivityBase & {
			type: 'workflow.published';
			data: WorkflowReviewWorkflowPublishedActivityData | null;
	  });
