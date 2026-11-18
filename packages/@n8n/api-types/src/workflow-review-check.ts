export type WorkflowReviewCheckStatus = 'pending' | 'running' | 'passed' | 'failed' | 'error';

/**
 * An automatic check on the version under review, such as a run of the workflow
 * tests. A review can be approved only when each of its checks passed.
 */
export interface WorkflowReviewCheck {
	/** The feature that owns the check, for example `workflow-tests`. The UI picks its copy by it. */
	id: string;
	workflowId: string;
	/** The version that the status describes. */
	workflowVersionId: string | null;
	status: WorkflowReviewCheckStatus;
	counts: { passed: number; failed: number; skipped: number; total: number } | null;
	/** Why the run did not finish. */
	message: string | null;
	/** Whether the viewer can start the check again. */
	viewerCanRun: boolean;
}
