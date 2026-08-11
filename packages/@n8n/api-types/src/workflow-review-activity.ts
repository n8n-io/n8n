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
