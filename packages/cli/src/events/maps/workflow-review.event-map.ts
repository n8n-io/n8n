import type { WorkflowReviewRequestDecision, WorkflowReviewRequestState } from '@n8n/api-types';

/**
 * Emitted whenever a workflow review request changes (opened, re-pinned to a
 * new version, decided), so other backend modules can track review state
 * without importing review internals.
 */
export type WorkflowReviewEventMap = {
	'workflow-review-updated': {
		workflowReviewRequestId: string;
		workflowId: string;
		state: WorkflowReviewRequestState;
		decision: WorkflowReviewRequestDecision;
	};
};
