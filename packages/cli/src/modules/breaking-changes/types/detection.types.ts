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
