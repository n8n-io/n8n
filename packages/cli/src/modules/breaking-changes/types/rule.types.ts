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

export interface AffectedWorkflow {
	id: string;
	name: string;
	active: boolean;
	recentExecutionCount?: number;
	issues: DetectionIssue[]; // List of issues affecting this workflow
}

export interface DetectionResult {
	ruleId: string;
	isAffected: boolean;
	affectedWorkflows: AffectedWorkflow[];
	instanceIssues: DetectionIssue[];
	recommendations: Recommendation[];
	details?: Record<string, unknown>;
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

export interface CommonDetectionInput {
	workflows: WorkflowEntity[];
}

export interface IBreakingChangeRule {
	getMetadata(): BreakingChangeMetadata;
	detect(input: CommonDetectionInput): Promise<DetectionResult>;
}
