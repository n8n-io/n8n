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
	stepType?: 'step' | 'approval' | 'condition' | 'sleep';
	retryConfig?: RetryConfig;
	timeout?: number;
	retriableErrors?: string[];
	retryOnTimeout?: boolean;
	sleepMs?: number;
	waitUntilExpr?: string;
}

export interface GraphNodeData {
	id: string;
	name: string;
	type: 'trigger' | 'step' | 'condition' | 'approval' | 'sleep' | 'end';
	stepFunctionRef: string;
	config: GraphStepConfig;
}

export interface GraphEdgeData {
	from: string;
	to: string;
	label?: string;
	condition?: string;
}
