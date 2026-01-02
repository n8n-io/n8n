import type { ComputedRef, Ref } from 'vue';
import type { EventHookOn } from '@vueuse/core';

/**
 * Document sync state machine.
 */
export type WorkflowDocumentState = 'idle' | 'connecting' | 'ready' | 'error';

/**
 * Raw workflow node data (not Vue Flow Node).
 * This is the canonical format stored in CRDT/REST.
 */
export interface WorkflowNode {
	id: string;
	position: [number, number];
	name: string;
	type: string;
	parameters: Record<string, unknown>;
}

/**
 * Raw workflow edge data (future).
 */
export interface WorkflowEdge {
	id: string;
	source: string;
	target: string;
	sourceHandle?: string;
	targetHandle?: string;
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

/**
 * Common interface for workflow document access.
 * Implemented by both CRDT and REST sources.
 * No Vue Flow types here - just raw workflow data.
 */
export interface WorkflowDocument {
	readonly workflowId: string;
	readonly state: Ref<WorkflowDocumentState>;
	readonly error: Ref<string | null>;
	readonly isReady: ComputedRef<boolean>;

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

	/** Remove a node by ID */
	removeNode(nodeId: string): void;

	/** Update node position */
	updateNodePosition(nodeId: string, position: [number, number]): void;

	/** Update node parameters */
	updateNodeParams(nodeId: string, params: Record<string, unknown>): void;

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
}
