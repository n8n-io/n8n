import type { WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';

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
	id: string;
	getMetadata(): BreakingChangeMetadata;
	detect(): Promise<InstanceDetectionResult>;
}

export interface IBreakingChangeWorkflowRule {
	id: string;
	getMetadata(): BreakingChangeMetadata;
	getRecommendations(workflowResults: AffectedWorkflow[]): Promise<Recommendation[]>;
	// The detectWorkflow function includes the nodes grouped by type for more efficient processing
	detectWorkflow(
		workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionResult>;
}

export type IBreakingChangeRule = IBreakingChangeInstanceRule | IBreakingChangeWorkflowRule;
