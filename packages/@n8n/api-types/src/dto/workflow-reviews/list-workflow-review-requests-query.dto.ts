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
 * Workflow-scoped list item — extends {@link WorkflowReviewRequestSummary} with
 * what the canvas review banner needs. Kept off the mutation responses, which
 * stay on the minimal summary.
 */
export interface WorkflowReviewRequestForWorkflow extends WorkflowReviewRequestSummary {
	/** The review description, but only for a requester who can act on the review */
	description: string | null;
	/** Name given to the pinned version; `null` when unnamed. */
	workflowVersionName: string | null;
	/** Who made the current decision; `null` when there is none or the user is gone. */
	decisionBy: WorkflowReviewEligibleReviewer | null;
	/**
	 * Whether the caller may open this review's detail.
	 */
	viewerCanOpen: boolean;
}

export interface WorkflowReviewRequestList {
	count: number;
	data: WorkflowReviewRequestForWorkflow[];
}
