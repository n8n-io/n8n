import type {
	BreakingChangeInstanceIssue,
	BreakingChangeRecommendation,
	BreakingChangeWorkflowIssue,
} from '@n8n/api-types';

export interface WorkflowDetectionReport {
	isAffected: boolean;
	issues: BreakingChangeWorkflowIssue[]; // List of issues affecting this workflow
}

export interface InstanceDetectionReport {
	isAffected: boolean;
	instanceIssues: BreakingChangeInstanceIssue[];
	recommendations: BreakingChangeRecommendation[];
}

/**
 * Report returned by batch workflow rules after processing all workflows.
 * Used when a rule needs to correlate data across multiple workflows before producing results.
 */
export interface BatchWorkflowDetectionReport {
	affectedWorkflows: Array<{
		workflowId: string;
		issues: BreakingChangeWorkflowIssue[];
	}>;
}
