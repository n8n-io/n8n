import type { WorkflowReviewEligibleReviewer } from '../../workflow-review-eligible-reviewer';
import type { WorkflowReviewRequestSummary } from '../../workflow-review-request-summary';

/** Review fields used by the Inbox row and detail response. */
export interface WorkflowReviewInboxItem extends WorkflowReviewRequestSummary {
	projectId: string;
	title: string;
	workflowName: string | null;
	requester: WorkflowReviewEligibleReviewer | null;
	authors: WorkflowReviewEligibleReviewer[];
	reviewers: WorkflowReviewEligibleReviewer[];
}
