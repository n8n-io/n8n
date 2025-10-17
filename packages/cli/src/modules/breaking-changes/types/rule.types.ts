export const enum BreakingChangeSeverity {
	CRITICAL = 'critical',
	HIGH = 'high',
	MEDIUM = 'medium',
	LOW = 'low',
}

export const enum BreakingChangeCategory {
	WORKFLOW = 'workflow',
	INSTANCE = 'instance',
	ENVIRONMENT = 'environment',
	DATABASE = 'database',
	INFRASTRUCTURE = 'infrastructure',
}

export const enum IssueLevel {
	ERROR = 'error',
	WARNING = 'warning',
	INFO = 'info',
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
	linearTicket?: string;
	deprecationDate?: Date;
}

export interface WorkflowIssue {
	title: string;
	description: string;
	level: IssueLevel;
}

export interface AffectedWorkflow {
	id: string;
	name: string;
	active: boolean;
	recentExecutionCount?: number;
	issues: WorkflowIssue[]; // List of issues affecting this workflow
}

export interface DetectionResult {
	ruleId: string;
	isAffected: boolean;
	affectedWorkflows: AffectedWorkflow[];
	instanceIssues: InstanceIssue[];
	recommendations: Recommendation[];
	details?: Record<string, unknown>;
}

export interface InstanceIssue {
	title: string; // e.g., "Environment Variables", "Database Configuration"
	description: string;
	level: IssueLevel; // error, warning, info
}

export interface Recommendation {
	action: string;
	description: string;
	documentationUrl?: string;
}

export interface IBreakingChangeRule {
	getMetadata(): BreakingChangeMetadata;
	detect(): Promise<DetectionResult>;
}
