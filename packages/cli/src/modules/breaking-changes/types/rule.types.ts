import type {
	BreakingChangeAffectedWorkflow,
	BreakingChangeAssistantAction,
	BreakingChangeRecommendation,
	BreakingChangeRuleImpact,
	BreakingChangeVersion,
} from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';

import type {
	BatchWorkflowDetectionReport,
	InstanceDetectionReport,
	WorkflowDetectionReport,
} from './detection.types';

export const enum BreakingChangeCategory {
	workflow = 'workflow',
	instance = 'instance',
	environment = 'environment',
	database = 'database',
	infrastructure = 'infrastructure',
}

/**
 * How a finding of a workflow rule is resolved.
 *
 * - `workflowEdit`: a change to the workflow clears the finding on the next save.
 * - `userConfirmation`: no workflow edit clears the finding, because the change is handled
 *   outside n8n or only needs a review. The user resolves it by setting the finding to won't fix.
 */
export type BreakingChangeRuleResolution = 'workflowEdit' | 'userConfirmation';

export interface BreakingChangeRuleMetadata {
	version: BreakingChangeVersion;
	title: string;
	description: string;
	category: BreakingChangeCategory;
	/** What happens if the user does not fix this breaking change. */
	impact: BreakingChangeRuleImpact;
	documentationUrl?: string;
	/** How a finding of this workflow rule is resolved. Defaults to `workflowEdit`. */
	resolution?: BreakingChangeRuleResolution;
	/** What n8n Assistant can do with this workflow rule's findings. Defaults to `none`. */
	assistant?: BreakingChangeAssistantAction;
}

export interface IBreakingChangeInstanceRule {
	id: string;
	getMetadata(): BreakingChangeRuleMetadata;
	detect(): Promise<InstanceDetectionReport>;
}

/**
 * Data that lives for one scan, so a rule loads it once and not once per workflow.
 * It has one typed field for each need. Make it generic when more rules need a cache.
 */
export interface WorkflowScanContext {
	/** Slack API credential ID to whether its signature secret is missing. */
	slackSignatureSecretMissing: Map<string, boolean>;
}

export const createWorkflowScanContext = (): WorkflowScanContext => ({
	slackSignatureSecretMissing: new Map(),
});

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
		context?: WorkflowScanContext,
	): Promise<WorkflowDetectionReport>;
}

/**
 * Interface for batch-based workflow rules that need to correlate data across multiple workflows.
 * Unlike IBreakingChangeWorkflowRule which processes each workflow independently,
 * batch rules collect data from all workflows first, then produce a final report.
 *
 * Use case example: Detecting parent workflows that call sub-workflows with specific characteristics,
 * where the rule needs to identify both the sub-workflows and their callers before reporting.
 */
export interface IBreakingChangeBatchWorkflowRule {
	id: string;
	getMetadata(): BreakingChangeRuleMetadata;
	getRecommendations(
		workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]>;

	/**
	 * Called for each workflow during the scanning phase.
	 * The rule should collect and store any relevant data internally.
	 */
	collectWorkflowData(
		workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<void>;

	/**
	 * Called after all workflows have been scanned to produce the final report.
	 * The rule should correlate the collected data and return the affected workflows.
	 */
	produceReport(): Promise<BatchWorkflowDetectionReport>;

	/**
	 * Called to reset internal state before a new detection run.
	 */
	reset(): void;
}

export type IBreakingChangeRule =
	| IBreakingChangeInstanceRule
	| IBreakingChangeWorkflowRule
	| IBreakingChangeBatchWorkflowRule;

/** The rule kinds that produce per-workflow findings. */
export type WorkflowLevelRule = IBreakingChangeWorkflowRule | IBreakingChangeBatchWorkflowRule;

export function isWorkflowLevelRule(rule: IBreakingChangeRule): rule is WorkflowLevelRule {
	return 'detectWorkflow' in rule || 'collectWorkflowData' in rule;
}

export function isInstanceRule(rule: IBreakingChangeRule): rule is IBreakingChangeInstanceRule {
	return 'detect' in rule;
}
