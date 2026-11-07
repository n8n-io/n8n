import type { ExecutionNodeError, OrchestrationContext } from '../../../types';
import type {
	RemediationMetadata,
	VerificationClaim,
} from '../../../workflow-loop/workflow-loop-state';

export interface VerifyToolInput {
	workItemId?: string;
	workflowId: string;
	inputData?: Record<string, unknown>;
	/** Trigger to start from; omitted means the adapter auto-detects one. */
	triggerNodeName?: string;
	timeout?: number;
	includeData?: boolean;
	maxDataChars?: number;
	fixtureOverrides?: Record<string, Array<Record<string, unknown>>>;
	/** Nodes this change is about — see the tool input description. */
	fixTargetNodeNames?: string[];
	/** Nodes whose override may pin zero items — the explicit opt-in for an empty-branch test. */
	allowZeroItemFixtures?: string[];
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
	/** Per-output counts for multi-output nodes (Filter, IF, Switch); `itemCount` sums them. */
	outputs?: Array<{ index: number; name?: string; itemCount?: number }>;
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
	nodeErrors?: ExecutionNodeError[];
	nodesNotReached?: string[];
	coverageNote?: string;
	claim?: VerificationClaim;
	data?: Record<string, unknown>;
	error?: string;
	remediation?: RemediationMetadata;
	guidance?: string;
}
