import type { ComputedRef, Ref } from 'vue';
import type { EventHookOn } from '@vueuse/core';
import type { CRDTAwareness, CRDTMap } from '@n8n/crdt';
import type { INodeExecutionData } from 'n8n-workflow';
import type { WorkflowAwarenessState } from './awareness.types';

/** Pinned data change event payload */
export interface PinnedDataChange {
	nodeId: string;
	data: INodeExecutionData[] | undefined;
}

/**
 * Document sync state machine.
 */
export type WorkflowDocumentState = 'idle' | 'connecting' | 'ready' | 'error';

/**
 * Pre-computed handle for a node (Vue Flow compatible).
 * Computed on the server to avoid expression evaluation on the main thread.
 */
export interface ComputedHandle {
	/** Handle ID: "{mode}/{type}/{index}" e.g., "inputs/main/0" */
	handleId: string;
	/** Connection type (e.g., "main", "ai_tool", "model") */
	type: string;
	/** Handle mode */
	mode: 'inputs' | 'outputs';
	/** Index within the type group */
	index: number;
	/** Optional display name */
	displayName?: string;
	/** Whether connection is required */
	required?: boolean;
	/** Maximum number of connections allowed */
	maxConnections?: number;
}

/**
 * Raw workflow node data (not Vue Flow Node).
 * This is the canonical format stored in CRDT/REST.
 */
export interface WorkflowNode {
	id: string;
	position: [number, number];
	name: string;
	type: string;
	typeVersion: number;
	parameters: Record<string, unknown>;
	/** Pre-computed input handles from server */
	inputs?: ComputedHandle[];
	/** Pre-computed output handles from server */
	outputs?: ComputedHandle[];
	/** Pre-computed node size [width, height] from server */
	size?: [number, number];
	/** Pre-computed subtitle from server (expression-resolved) */
	subtitle?: string;
	/** Whether the node is disabled (won't execute) */
	disabled?: boolean;
	// Node settings (top-level properties, not in parameters)
	/** Always output data even when empty */
	alwaysOutputData?: boolean;
	/** Execute only once (not per input item) */
	executeOnce?: boolean;
	/** Retry on failure */
	retryOnFail?: boolean;
	/** Max retry attempts */
	maxTries?: number;
	/** Wait time between retries in ms */
	waitBetweenTries?: number;
	/** Error handling behavior */
	onError?: string;
	/** Node notes */
	notes?: string;
	/** Show notes in flow view */
	notesInFlow?: boolean;
	/** Node color */
	color?: string;
}

/**
 * Raw workflow edge data in Vue Flow native format.
 * Stored flat in CRDT, converted to IConnections for Workflow class.
 *
 * Handle format: "{mode}/{type}/{index}"
 * Examples:
 *   - "outputs/main/0" (first main output)
 *   - "inputs/main/2" (third main input)
 *   - "outputs/ai_tool/0" (first AI tool output)
 */
export interface WorkflowEdge {
	/** Edge ID: "[sourceId/sourceHandle][targetId/targetHandle]" */
	id: string;
	/** Source node ID (UUID) */
	source: string;
	/** Target node ID (UUID) */
	target: string;
	/** Source handle: "outputs/{type}/{index}" */
	sourceHandle: string;
	/** Target handle: "inputs/{type}/{index}" */
	targetHandle: string;
}

/** Node position change event payload */
export interface NodePositionChange {
	nodeId: string;
	position: [number, number];
}

/** Node params change event payload */
export interface NodeParamsChange {
	nodeId: string;
	params: Record<string, unknown>;
}

/** Node handles change event payload (inputs/outputs recomputed) */
export interface NodeHandlesChange {
	nodeId: string;
	inputs: ComputedHandle[];
	outputs: ComputedHandle[];
}

/** Node size change event payload (recomputed when handles change) */
export interface NodeSizeChange {
	nodeId: string;
	size: [number, number];
}

/** Node subtitle change event payload (recomputed by server) */
export interface NodeSubtitleChange {
	nodeId: string;
	subtitle: string | undefined;
}

/** Node disabled state change event payload */
export interface NodeDisabledChange {
	nodeId: string;
	disabled: boolean;
}

/** Node name change event payload */
export interface NodeNameChange {
	nodeId: string;
	name: string;
}

/**
 * Common interface for workflow document access.
 * Implemented by both CRDT and REST sources.
 * No Vue Flow types here - just raw workflow data.
 */
export interface WorkflowDocument {
	/** The workflow/document ID (shared for same workflow across views) */
	readonly workflowId: string;
	/** Unique instance ID for this view (use for Vue Flow and awareness) */
	readonly instanceId: string;
	readonly state: Ref<WorkflowDocumentState>;
	readonly error: Ref<string | null>;
	readonly isReady: ComputedRef<boolean>;

	// --- Undo/Redo ---

	/** Whether undo is possible (reactive) */
	readonly canUndo: Ref<boolean>;

	/** Whether redo is possible (reactive) */
	readonly canRedo: Ref<boolean>;

	/** Undo the last change. Returns true if undo was performed. */
	undo(): boolean;

	/** Redo the last undone change. Returns true if redo was performed. */
	redo(): boolean;

	// --- Lifecycle ---

	/** Connect to data source */
	connect(): Promise<void>;

	/** Disconnect from data source */
	disconnect(): void;

	// --- Data Access ---

	/** Get all nodes */
	getNodes(): WorkflowNode[];

	/** Get all edges (future) */
	getEdges(): WorkflowEdge[];

	// --- Mutations ---

	/** Add a new node */
	addNode(node: WorkflowNode): void;

	/** Add multiple nodes in a single transaction */
	addNodes(nodes: WorkflowNode[]): void;

	/** Add multiple nodes and edges in a single atomic transaction */
	addNodesAndEdges(nodes: WorkflowNode[], edges: WorkflowEdge[]): void;

	/** Remove a node by ID */
	removeNode(nodeId: string): void;

	/**
	 * Remove multiple nodes and edges in a single atomic transaction.
	 * Also adds any reconnection edges (for node deletion with auto-reconnect).
	 * @param nodeIds - Node IDs to remove
	 * @param edgeIds - Edge IDs to remove
	 * @param reconnections - New edges to add (for reconnecting around deleted nodes)
	 */
	removeNodesAndEdges(nodeIds: string[], edgeIds: string[], reconnections: WorkflowEdge[]): void;

	/** Update node positions (batch) */
	updateNodePositions(updates: NodePositionChange[]): void;

	/** Update node parameters (replaces all parameters) */
	updateNodeParams(nodeId: string, params: Record<string, unknown>): void;

	/**
	 * Update a specific parameter at a given path.
	 * This enables fine-grained updates that won't conflict with changes to other parameters.
	 * @param nodeId - The node ID
	 * @param path - Array of keys to the parameter (e.g., ['operation'] or ['fields', '0', 'name'])
	 * @param value - The new value
	 */
	updateNodeParamAtPath?(nodeId: string, path: string[], value: unknown): void;

	/**
	 * Set the disabled state of a node.
	 * @param nodeId - The node ID
	 * @param disabled - Whether the node should be disabled
	 */
	setNodeDisabled(nodeId: string, disabled: boolean): void;

	// --- Edge Mutations ---

	/**
	 * Add an edge to the workflow.
	 * @param edge - The edge to add
	 */
	addEdge(edge: WorkflowEdge): void;

	/**
	 * Remove an edge by ID.
	 * @param edgeId - The edge ID to remove
	 */
	removeEdge(edgeId: string): void;

	// --- Remote Change Events (VueUse EventHook pattern) ---
	// CRDT: fires when other users make changes
	// REST: never fires (single user)

	/** Subscribe to node additions */
	onNodeAdded: EventHookOn<WorkflowNode>;

	/** Subscribe to node removals */
	onNodeRemoved: EventHookOn<string>;

	/** Subscribe to node position changes */
	onNodePositionChange: EventHookOn<NodePositionChange>;

	/** Subscribe to node parameter changes (future) */
	onNodeParamsChange: EventHookOn<NodeParamsChange>;

	/** Subscribe to node handle changes (inputs/outputs recomputed by server) */
	onNodeHandlesChange: EventHookOn<NodeHandlesChange>;

	/** Subscribe to node size changes (recomputed when handles change) */
	onNodeSizeChange: EventHookOn<NodeSizeChange>;

	/** Subscribe to node subtitle changes (recomputed by server) */
	onNodeSubtitleChange: EventHookOn<NodeSubtitleChange>;

	/** Subscribe to node disabled state changes */
	onNodeDisabledChange: EventHookOn<NodeDisabledChange>;

	/** Subscribe to node name changes (for Vue Flow label sync) */
	onNodeNameChange: EventHookOn<NodeNameChange>;

	/** Subscribe to edge additions (remote/undo only - for Vue Flow sync) */
	onEdgeAdded: EventHookOn<WorkflowEdge>;

	/** Subscribe to edge removals (remote/undo only - for Vue Flow sync) */
	onEdgeRemoved: EventHookOn<string>;

	/**
	 * Subscribe to any edge change (all origins - for reactivity).
	 * Fires for local, remote, and undo/redo changes.
	 * Use this when you need to react to edge count changes (e.g., handle connectivity).
	 */
	onEdgesChanged: EventHookOn<undefined>;

	/** Find a node by ID */
	findNode(nodeId: string): WorkflowNode | undefined;

	// --- Awareness (CRDT only) ---

	/**
	 * The awareness instance for real-time presence/cursors/dragging.
	 * Only available for CRDT documents, null for REST documents.
	 */
	readonly awareness: CRDTAwareness<WorkflowAwarenessState> | null;

	/**
	 * Get the raw CRDT parameters map for a node (CRDT only).
	 * Useful for advanced use cases like subscribing to parameter changes.
	 * Returns undefined if node doesn't exist or if using REST document.
	 */
	getNodeParametersMap?(nodeId: string): CRDTMap<unknown> | undefined;

	/**
	 * Get the raw CRDT map for a node (CRDT only).
	 * Useful for subscribing to all node changes (parameters + settings).
	 * Returns undefined if node doesn't exist or if using REST document.
	 */
	getNodeCrdtMap?(nodeId: string): CRDTMap<unknown> | undefined;

	/**
	 * Set a top-level node setting (e.g., alwaysOutputData, executeOnce).
	 * Use for node properties that are NOT in node.parameters.
	 */
	setNodeSetting?(nodeId: string, key: string, value: unknown): void;

	// --- Pinned Data (CRDT only) ---

	/**
	 * Get pinned data for a node by ID.
	 * Returns undefined if node has no pinned data or if using REST document.
	 */
	getPinnedData?(nodeId: string): INodeExecutionData[] | undefined;

	/**
	 * Set pinned data for a node by ID.
	 * @param nodeId - The node ID
	 * @param data - The pinned data array
	 */
	setPinnedData?(nodeId: string, data: INodeExecutionData[]): void;

	/**
	 * Remove pinned data for a node by ID.
	 * @param nodeId - The node ID
	 */
	removePinnedData?(nodeId: string): void;

	/**
	 * Subscribe to pinned data changes (CRDT only).
	 * Fires when pinned data is added, updated, or removed for any node.
	 */
	onPinnedDataChange?: EventHookOn<PinnedDataChange>;
}
