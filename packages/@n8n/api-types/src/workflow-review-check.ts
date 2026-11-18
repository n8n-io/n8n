export type WorkflowReviewCheckStatus = 'pending' | 'running' | 'passed' | 'failed' | 'error';

/**
 * An automatic check on the version under review, such as a run of the workflow
 * tests. A review can be approved only when each of its checks passed.
 */
export interface WorkflowReviewCheck {
	/**
	 * The feature that owns the check, for example `workflow-tests` or
	 * `workflow-caller-tests`. The UI picks its copy by it.
	 */
	id: string;
	/** The reviewed workflow. */
	workflowId: string;
	/**
	 * The workflow whose tests ran: the reviewed workflow, or a workflow that
	 * calls it as a sub-workflow.
	 */
	testWorkflowId: string;
	/**
	 * The name of a caller. `null` for the reviewed workflow's own tests, and for a
	 * caller that the viewer cannot read.
	 */
	testWorkflowName: string | null;
	/** The version that the status describes. */
	workflowVersionId: string | null;
	status: WorkflowReviewCheckStatus;
	counts: { passed: number; failed: number; skipped: number; total: number } | null;
	/** Why the run did not finish. */
	message: string | null;
	/** Whether the viewer can start the check again. */
	viewerCanRun: boolean;
}
