import { n8nIdSchema } from '../../schemas/id.schema';
import type { WorkflowReviewEligibleReviewer } from '../../workflow-review-eligible-reviewer';
import {
	type WorkflowReviewRequestSummary,
	workflowReviewRequestStateSchema,
} from '../../workflow-review-request-summary';
import { Z } from '../../zod-class';
import { paginationSchema } from '../pagination/pagination.dto';

export class ListWorkflowReviewRequestsQueryDto extends Z.class({
	...paginationSchema,
	// Required until cross-workflow listing gets project-based access filtering (LIGO-597)
	workflowId: n8nIdSchema,
	state: workflowReviewRequestStateSchema.optional(),
}) {}

/**
 * Whether an approved review's pinned version ever reached production, derived
 * from workflow publish history:
 * - `published`: the pinned version itself was published;
 * - `superseded`: a version created after the pinned one was published;
 * - `not_published`: neither happened;
 * - `unknown`: the pin is null or its history row was pruned (LIGO-879), so the
 *   state cannot be derived safely.
 *
 * A later deactivation does not undo `published`/`superseded`.
 */
export type WorkflowReviewApprovedPublicationState =
	| 'published'
	| 'superseded'
	| 'not_published'
	| 'unknown';

/**
 * Workflow-scoped list item — extends {@link WorkflowReviewRequestSummary} with
 * what the canvas review banner needs. Kept off the mutation responses, which
 * stay on the minimal summary.
 */
export interface WorkflowReviewRequestForWorkflow extends WorkflowReviewRequestSummary {
	/** The review description, but only for a requester who can act on the review */
	description: string | null;
	/** Who made the current decision; `null` when there is none or the user is gone. */
	decisionBy: WorkflowReviewEligibleReviewer | null;
	/** Only derived for an approved review; `null` otherwise. */
	approvedVersionPublicationState: WorkflowReviewApprovedPublicationState | null;
}

export interface WorkflowReviewRequestList {
	count: number;
	data: WorkflowReviewRequestForWorkflow[];
}
