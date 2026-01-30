import type { InjectionKey, ComputedRef } from 'vue';
import type { EventHookOn } from '@vueuse/core';

/**
 * User information for awareness display.
 */
export interface AwarenessUser {
	/** User ID from n8n */
	id: string;
	/** Display name */
	name: string;
	/** User's assigned color (for cursors, selections) */
	color: string;
	/** Optional avatar URL */
	avatarUrl?: string;
}

/**
 * Cursor position on the canvas.
 */
export interface AwarenessCursor {
	/** X coordinate in canvas space */
	x: number;
	/** Y coordinate in canvas space */
	y: number;
}

/**
 * Node selection state.
 */
export interface AwarenessSelection {
	/** IDs of selected nodes */
	nodeIds: string[];
}

/**
 * Activity state for a collaborator.
 */
export type AwarenessActivity = 'active' | 'idle' | 'away';

/**
 * Ephemeral node position during drag operation.
 * Used to show real-time node movement without creating CRDT transactions.
 */
export interface DraggingNode {
	/** Node ID being dragged */
	nodeId: string;
	/** Current position during drag [x, y] */
	position: [number, number];
}

/**
 * Full awareness state for a workflow collaborator.
 * This is what gets synced via CRDT awareness.
 *
 * Awareness is ephemeral - not persisted, used for:
 * - User presence (who is online)
 * - Cursor positions
 * - Node selections
 * - Real-time drag updates (before CRDT commit)
 */
export interface WorkflowAwarenessState {
	/** User information */
	user: AwarenessUser;
	/** Current cursor position (null if not on canvas) */
	cursor: AwarenessCursor | null;
	/** Current node selection */
	selection: AwarenessSelection;
	/** Activity state */
	activity: AwarenessActivity;
	/** Timestamp of last activity (for idle detection) */
	lastActive: number;
	/**
	 * Nodes currently being dragged by this user.
	 * Supports multiple nodes being dragged simultaneously.
	 * Other users see these positions in real-time during drag.
	 * When drag ends, positions are committed to CRDT and this is cleared.
	 */
	dragging: DraggingNode[];
	/** Index signature to satisfy AwarenessState constraint */
	[key: string]: unknown;
}

/**
 * A collaborator with their client ID and state.
 */
export interface Collaborator {
	/** CRDT client ID (unique per browser tab) */
	clientId: number;
	/** The collaborator's awareness state */
	state: WorkflowAwarenessState;
}

/** Event payload when a collaborator's dragging state changes */
export interface CollaboratorDraggingChange {
	/** The collaborator who is dragging */
	collaborator: Collaborator;
	/** Nodes being dragged (empty array = drag ended) */
	nodes: DraggingNode[];
}

/**
 * Return type for useWorkflowAwareness composable.
 */
export interface UseWorkflowAwarenessReturn {
	/** This client's ID */
	readonly clientId: ComputedRef<number | null>;

	/** All collaborators (excluding self), reactive Map keyed by clientId */
	readonly collaborators: Map<number, Collaborator>;

	/** Total count including self */
	readonly collaboratorCount: ComputedRef<number>;

	/** Whether awareness is connected and ready */
	readonly isReady: ComputedRef<boolean>;

	/** Set local user info (call once on connect) */
	setUser(user: AwarenessUser): void;

	/** Update cursor position */
	updateCursor(cursor: AwarenessCursor | null): void;

	/** Update node selection */
	updateSelection(nodeIds: string[]): void;

	/** Update activity state */
	updateActivity(activity: AwarenessActivity): void;

	/** Mark as active (resets idle timer) */
	markActive(): void;

	/**
	 * Update dragging nodes positions.
	 * Call this during drag to broadcast ephemeral positions to other users.
	 * Supports multiple nodes being dragged at once.
	 * Pass empty array when drag ends (positions should be committed to CRDT separately).
	 */
	updateDragging(nodes: DraggingNode[]): void;

	/**
	 * Get the ephemeral position for a node if any collaborator is dragging it.
	 * Returns undefined if no one is dragging this node.
	 * Used by canvas to show real-time positions during drag.
	 */
	getDraggingPosition(nodeId: string): [number, number] | undefined;

	/**
	 * Reactive reverse index: nodeId -> users who have selected it.
	 * Imperatively maintained - only updates when selections change, not on cursor moves.
	 * Use for O(1) lookup of who is selecting a specific node.
	 */
	readonly nodeIdToSelectingUsers: Map<string, AwarenessUser[]>;

	// --- Remote Change Events (VueUse EventHook pattern) ---

	/** Subscribe to collaborator joining */
	onCollaboratorJoin: EventHookOn<Collaborator>;

	/** Subscribe to collaborator leaving */
	onCollaboratorLeave: EventHookOn<Collaborator>;

	/** Subscribe to collaborator dragging changes */
	onDraggingChange: EventHookOn<CollaboratorDraggingChange>;
}

/**
 * Injection key for workflow awareness.
 */
export const WorkflowAwarenessKey: InjectionKey<UseWorkflowAwarenessReturn> =
	Symbol('WorkflowAwareness');
