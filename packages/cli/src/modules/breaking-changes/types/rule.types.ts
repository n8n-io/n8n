import type { WorkflowEntity } from '@n8n/db';

export const enum BreakingChangeSeverity {
	critical = 'critical',
	high = 'high',
	medium = 'medium',
	low = 'low',
}

export const enum BreakingChangeCategory {
	workflow = 'workflow',
	instance = 'instance',
	environment = 'environment',
	database = 'database',
	infrastructure = 'infrastructure',
}

export const enum IssueLevel {
	error = 'error',
	warning = 'warning',
	info = 'info',
}

export type BreakingChangeVersion = 'v2';

export interface BreakingChangeMetadata {
	id: string;
	version: BreakingChangeVersion;
	title: string;
	description: string;
	category: BreakingChangeCategory;
	severity: BreakingChangeSeverity;
	documentationUrl?: string;
}

export interface WorkflowDetectionResult {
	isAffected: boolean;
	issues: DetectionIssue[]; // List of issues affecting this workflow
}

export interface InstanceDetectionResult {
	isAffected: boolean;
	instanceIssues: DetectionIssue[];
	recommendations: Recommendation[];
}

export type AffectedWorkflow = Omit<WorkflowDetectionResult, 'isAffected'> & {
	id: string;
	name: string;
	active: boolean;
};

export interface DetectionResult {
	ruleId: string;
	affectedWorkflows: AffectedWorkflow[];
	instanceIssues: DetectionIssue[];
	recommendations: Recommendation[];
}

export interface DetectionIssue {
	title: string; // e.g., "Environment Variables", "Database Configuration"
	description: string;
	level: IssueLevel; // error, warning, info
}

export interface Recommendation {
	action: string;
	description: string;
	documentationUrl?: string;
}

export interface IBreakingChangeInstanceRule {
	getMetadata(): BreakingChangeMetadata;
	detect(): Promise<InstanceDetectionResult>;
}

export interface IBreakingChangeWorkflowRule {
	getMetadata(): BreakingChangeMetadata;
	getRecommendations(workflowResults: AffectedWorkflow[]): Promise<Recommendation[]>;
	detectWorkflow(workflow: WorkflowEntity): Promise<WorkflowDetectionResult>;
}

export type IBreakingChangeRule = IBreakingChangeInstanceRule | IBreakingChangeWorkflowRule;
