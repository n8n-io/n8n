import type {
	BreakingChangeAffectedWorkflow,
	BreakingChangeRecommendation,
	BreakingChangeRuleSeverity,
} from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';

import type { InstanceDetectionReport, WorkflowDetectionReport } from './detection.types';

export const enum BreakingChangeCategory {
	workflow = 'workflow',
	instance = 'instance',
	environment = 'environment',
	database = 'database',
	infrastructure = 'infrastructure',
}

export type BreakingChangeVersion = 'v2';

export interface BreakingChangeRuleMetadata {
	version: BreakingChangeVersion;
	title: string;
	description: string;
	category: BreakingChangeCategory;
	severity: BreakingChangeRuleSeverity;
	documentationUrl?: string;
}

export interface IBreakingChangeInstanceRule {
	id: string;
	getMetadata(): BreakingChangeRuleMetadata;
	detect(): Promise<InstanceDetectionReport>;
}

export interface IBreakingChangeWorkflowRule {
	id: string;
	getMetadata(): BreakingChangeRuleMetadata;
	getRecommendations(
		workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]>;
	// The detectWorkflow function includes the nodes grouped by type for more efficient processing
	detectWorkflow(
		workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport>;
}

export type IBreakingChangeRule = IBreakingChangeInstanceRule | IBreakingChangeWorkflowRule;
