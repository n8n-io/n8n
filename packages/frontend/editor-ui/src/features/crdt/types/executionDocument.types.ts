/**
 * CRDT Execution Document Types
 *
 * Types for storing execution state in a CRDT document.
 * Designed to match the push event structure for expression resolution compatibility.
 */

import type { ComputedRef, Ref } from 'vue';
import type { EventHookOn } from '@vueuse/core';
import type {
	ExecutionStatus,
	ISourceData,
	ITaskData,
	NodeExecutionHint,
	WorkflowExecuteMode,
} from 'n8n-workflow';

/**
 * Execution document sync state.
 */
export type ExecutionDocumentState = 'idle' | 'connecting' | 'ready' | 'error';

/**
 * Execution metadata stored in the 'meta' map.
 */
export interface ExecutionMeta {
	executionId: string;
	workflowId: string;
	status: ExecutionStatus;
	mode: WorkflowExecuteMode;
	startedAt: number;
	finishedAt?: number;
}

/**
 * Edge execution state stored in the 'edges' map.
 * Keyed by edge ID for O(1) lookup.
 */
export interface EdgeExecutionState {
	edgeId: string;
	sourceNodeName: string;
	targetNodeName?: string;
	connectionType: string;
	outputIndex: number;
	/** Total items passed through this edge */
	totalItems: number;
	/** Number of execution iterations */
	iterations: number;
}

/**
 * Node execution change event payload.
 */
export interface NodeExecutionChange {
	nodeId: string;
	nodeName: string;
	status: ExecutionStatus | 'running' | 'idle';
	runIndex: number;
}

/**
 * Edge execution change event payload.
 */
export interface EdgeExecutionChange {
	edgeId: string;
	totalItems: number;
	iterations: number;
}

/**
 * Execution meta change event payload.
 */
export interface ExecutionMetaChange {
	executionId: string;
	status: ExecutionStatus;
}

/**
 * Common interface for execution document access.
 * Provides read-only access to execution state from frontend components.
 */
export interface ExecutionDocument {
	/** The execution document ID (same as workflow ID) */
	readonly workflowId: string;
	readonly state: Ref<ExecutionDocumentState>;
	readonly error: Ref<string | null>;
	readonly isReady: ComputedRef<boolean>;

	// --- Lifecycle ---

	/** Connect to the execution document */
	connect(): Promise<void>;

	/** Disconnect from the execution document */
	disconnect(): void;

	// --- Data Access ---

	/** Get execution metadata */
	getMeta(): ExecutionMeta | null;

	/**
	 * Get execution data for a node by name.
	 * Returns array of ITaskData for loops/retries.
	 */
	getNodeExecutionByName(nodeName: string): ITaskData[] | null;

	/**
	 * Get execution data for a node by ID.
	 * Uses nodeIndex to look up name, then returns data.
	 */
	getNodeExecutionById(nodeId: string): ITaskData[] | null;

	/**
	 * Get edge execution data by edge ID.
	 */
	getEdgeExecution(edgeId: string): EdgeExecutionState | null;

	/**
	 * Get all node names that called this node (from source field).
	 */
	getCallingNodes(nodeName: string): string[];

	/**
	 * Get the node name for a given node ID.
	 * Uses the nodeIndex built at execution start.
	 */
	getNodeNameById(nodeId: string): string | null;

	// --- Resolved Expressions ---

	/**
	 * Get a resolved expression value for a specific parameter path.
	 * @param nodeId - The node ID
	 * @param paramPath - The parameter path (e.g., "parameters.value")
	 */
	getResolvedParam(nodeId: string, paramPath: string): ResolvedValue | null;

	/**
	 * Get all resolved expression values for a node.
	 * Returns a Map of paramPath → ResolvedValue
	 */
	getAllResolvedParams(nodeId: string): Map<string, ResolvedValue>;

	// --- Events ---

	/** Subscribe to execution started (new execution, clears previous data) */
	onExecutionStarted: EventHookOn<{ executionId: string }>;

	/** Subscribe to execution meta changes (status, etc.) */
	onMetaChange: EventHookOn<ExecutionMetaChange>;

	/** Subscribe to node execution changes */
	onNodeExecutionChange: EventHookOn<NodeExecutionChange>;

	/** Subscribe to edge execution changes (item counts) */
	onEdgeExecutionChange: EventHookOn<EdgeExecutionChange>;

	/** Subscribe to resolved params changes */
	onResolvedParamChange: EventHookOn<ResolvedParamChange>;
}

/**
 * Push event types from the server.
 * These match the @n8n/api-types push message types.
 */
export interface ExecutionStartedPushData {
	executionId: string;
	mode: WorkflowExecuteMode;
	startedAt: string; // ISO date string
	workflowId: string;
	workflowName?: string;
	flattedRunData?: string;
}

export interface NodeExecuteBeforePushData {
	executionId: string;
	nodeName: string;
	data: {
		startTime: number;
		executionIndex: number;
		source: Array<ISourceData | null>;
		hints?: NodeExecutionHint[];
	};
}

export interface NodeExecuteAfterPushData {
	executionId: string;
	nodeName: string;
	data: Omit<ITaskData, 'data'>;
	itemCountByConnectionType: Record<string, number[]>;
}

export interface NodeExecuteAfterDataPushData {
	executionId: string;
	nodeName: string;
	data: ITaskData;
	itemCountByConnectionType: Record<string, number[]>;
}

export interface ExecutionFinishedPushData {
	executionId: string;
	workflowId: string;
	status: ExecutionStatus;
}

/**
 * Union type for all push event data.
 */
export type ExecutionPushData =
	| { type: 'executionStarted'; data: ExecutionStartedPushData }
	| { type: 'nodeExecuteBefore'; data: NodeExecuteBeforePushData }
	| { type: 'nodeExecuteAfter'; data: NodeExecuteAfterPushData }
	| { type: 'nodeExecuteAfterData'; data: NodeExecuteAfterDataPushData }
	| { type: 'executionFinished'; data: ExecutionFinishedPushData };

// =============================================================================
// Resolved Expression Types
// =============================================================================

/**
 * Resolution state for an expression.
 * - 'valid': Expression resolved successfully
 * - 'pending': Expression needs execution data that doesn't exist yet
 * - 'invalid': Expression has a syntax error or other issue
 */
export type ResolvedState = 'valid' | 'pending' | 'invalid';

/**
 * A resolved expression value stored in the execution document.
 * Keyed by "{nodeId}:{paramPath}" in the resolvedParams map.
 */
export interface ResolvedValue {
	/** The original expression (e.g., "={{ $json.name }}") */
	expression: string;
	/** The resolved value (e.g., "John") or null if pending/invalid */
	resolved: unknown;
	/** Resolution state */
	state: ResolvedState;
	/** Error message if state is 'invalid' */
	error?: string;
	/** Last resolution timestamp */
	resolvedAt: number;
}

/**
 * Event payload for resolved params changes.
 */
export interface ResolvedParamChange {
	nodeId: string;
	paramPath: string;
}

/**
 * Create a key for the resolvedParams map.
 * Format: "{nodeId}:{paramPath}"
 *
 * @example
 * resolvedParamKey('abc123', 'parameters.value') // "abc123:parameters.value"
 * resolvedParamKey('abc123', 'parameters.options.retry') // "abc123:parameters.options.retry"
 */
export function resolvedParamKey(nodeId: string, paramPath: string): string {
	return `${nodeId}:${paramPath}`;
}

/**
 * Parse a resolvedParams map key into its components.
 * Returns null if the key is invalid.
 *
 * @example
 * parseResolvedParamKey('abc123:parameters.value')
 * // { nodeId: 'abc123', paramPath: 'parameters.value' }
 */
export function parseResolvedParamKey(key: string): { nodeId: string; paramPath: string } | null {
	const colonIndex = key.indexOf(':');
	if (colonIndex === -1) return null;
	return {
		nodeId: key.slice(0, colonIndex),
		paramPath: key.slice(colonIndex + 1),
	};
}
