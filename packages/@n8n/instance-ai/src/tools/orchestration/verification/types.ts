import type { OrchestrationContext } from '../../../types';
import type { RemediationMetadata } from '../../../workflow-loop/workflow-loop-state';

export interface VerifyToolInput {
	workItemId?: string;
	workflowId: string;
	inputData?: Record<string, unknown>;
	timeout?: number;
	includeData?: boolean;
	maxDataChars?: number;
	fixtureOverrides?: Record<string, Array<Record<string, unknown>>>;
}

export interface ResolvedVerifyInput extends VerifyToolInput {
	workItemId: string;
}

export type WorkflowTaskService = NonNullable<OrchestrationContext['workflowTaskService']>;

export type ExecutionRunResult = Awaited<
	ReturnType<NonNullable<OrchestrationContext['domainContext']>['executionService']['run']>
>;

export interface VerificationNodePreview {
	nodeName: string;
	itemCount?: number;
	preview: string;
	truncated: boolean;
	chars: number;
	simulated?: boolean;
}

export interface VerifyBuiltWorkflowOutput {
	resolvedWorkItemId?: string;
	executionId?: string;
	success: boolean;
	status?: 'running' | 'success' | 'error' | 'waiting' | 'unknown';
	nodesExecuted?: string[];
	nodePreviews?: VerificationNodePreview[];
	simulatedNodes?: Array<{ nodeName: string; reason: string }>;
	simulationNote?: string;
	lastNodeExecuted?: string;
	nodesNotReached?: string[];
	coverageNote?: string;
	data?: Record<string, unknown>;
	error?: string;
	remediation?: RemediationMetadata;
	guidance?: string;
}
