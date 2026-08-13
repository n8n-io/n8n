import type { IDataObject } from 'n8n-workflow';

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
 */
export type WorkflowReviewActivityEntry =
	| (WorkflowReviewActivityBase & {
			type: 'comment.created';
			data: null;
			messages: WorkflowReviewActivityMessage[];
	  })
	| (WorkflowReviewActivityBase & {
			type: Exclude<WorkflowReviewActivityType, 'comment.created'>;
			data: IDataObject | null;
	  });
