import type { RetryConfig } from '../sdk/types';

export interface WorkflowGraphData {
	nodes: GraphNodeData[];
	edges: GraphEdgeData[];
}

/**
 * Step configuration stored in the graph node.
 * This is a subset of StepDefinition properties relevant at runtime,
 * with `retryConfig` instead of `retry` to match engine usage.
 */
export interface GraphStepConfig {
	name?: string;
	description?: string;
	icon?: string;
	color?: string;
	stepType?: 'step' | 'approval' | 'condition' | 'sleep' | 'batch';
	retryConfig?: RetryConfig;
	timeout?: number;
	retriableErrors?: string[];
	retryOnTimeout?: boolean;
	sleepMs?: number;
	waitUntilExpr?: string;
	/** Target workflow name for trigger-workflow nodes */
	workflow?: string;
	/** Batch failure strategy */
	onItemFailure?: 'fail-fast' | 'continue' | 'abort-remaining';
	/** Agent-specific config — populated by the transpiler from ctx.agent() calls */
	agentConfig?: {
		/** Default timeout override for agent steps (longer than regular steps) */
		timeout?: number;
	};
}

export interface GraphNodeData {
	id: string;
	name: string;
	type:
		| 'trigger'
		| 'step'
		| 'batch'
		| 'condition'
		| 'approval'
		| 'sleep'
		| 'trigger-workflow'
		| 'agent'
		| 'end';
	stepFunctionRef: string;
	config: GraphStepConfig;
}

export interface GraphEdgeData {
	from: string;
	to: string;
	label?: string;
	condition?: string;
}
