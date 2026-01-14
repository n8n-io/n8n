/**
 * Function returned by event subscriptions to unsubscribe from events.
 */
export type Unsubscribe = () => void;

/**
 * Change action types for deep change events.
 */
export const ChangeAction = {
	add: 'add',
	update: 'update',
	delete: 'delete',
} as const;

export type ChangeAction = (typeof ChangeAction)[keyof typeof ChangeAction];

/**
 * Represents a deep change event emitted when nested data in a CRDT structure changes.
 * Used for Map changes (key-value updates).
 */
export interface DeepChangeEvent {
	/** Full path to changed value, e.g., ['node-1', 'position', 'x'] */
	path: Array<string | number>;
	/** Type of change */
	action: ChangeAction;
	/** New value (for add/update) */
	value?: unknown;
	/** Previous value (for update/delete) */
	oldValue?: unknown;
}

/**
 * Delta operation for array changes (Quill delta format).
 * At most one of insert/retain/delete should be set.
 */
export interface ArrayDelta {
	/** Items to insert at current position */
	insert?: unknown[];
	/** Number of items to skip/retain */
	retain?: number;
	/** Number of items to delete */
	delete?: number;
}

/**
 * Array change event using delta format.
 */
export interface ArrayChangeEvent {
	/** Path to the array that changed */
	path: Array<string | number>;
	/** Delta operations describing the change */
	delta: ArrayDelta[];
}

/**
 * Union type for deep change events from observeDeep.
 * Array mutations emit ArrayChangeEvent (delta format).
 * Map mutations emit DeepChangeEvent (action format).
 */
export type DeepChange = ArrayChangeEvent | DeepChangeEvent;

/**
 * Origin constants for identifying the source of CRDT changes.
 */
export const ChangeOrigin = {
	/** Change originated from local user action */
	local: 'local',
	/** Change originated from remote peer (network sync) */
	remote: 'remote',
	/** Change originated from local undo/redo operation */
	undoRedo: 'undoRedo',
} as const;

export type ChangeOrigin = (typeof ChangeOrigin)[keyof typeof ChangeOrigin];

/**
 * Type guard to check if a DeepChange is a DeepChangeEvent (map change).
 */
export function isMapChange(change: DeepChange): change is DeepChangeEvent {
	return 'action' in change;
}

/**
 * Type guard to check if a DeepChange is an ArrayChangeEvent (array change).
 */
export function isArrayChange(change: DeepChange): change is ArrayChangeEvent {
	return 'delta' in change;
}

/**
 * CRDT Array data structure - an ordered list with deep change observation.
 * Supports standard array operations and emits change events for mutations.
 *
 * Note on bounds checking: Behavior for out-of-bounds indices may vary by provider.
 * Use valid indices (0 <= index <= length) for consistent cross-provider behavior.
 *
 * Note on nested values: Plain JS objects/arrays stored in the array are returned as-is.
 * For collaborative editing of nested structures, use doc.getMap()/getArray() with explicit paths.
 */
export interface CRDTArray<T = unknown> {
	/** Get the number of elements */
	readonly length: number;
	/** Get element at index. Returns the value as stored (plain objects stay plain). */
	get(index: number): T | undefined;
	/** Append element(s) to end */
	push(...items: T[]): void;
	/** Insert element(s) at index. Use index <= length for consistent behavior. */
	insert(index: number, ...items: T[]): void;
	/** Delete count elements starting at index. Use valid indices for consistent behavior. */
	delete(index: number, count?: number): void;
	/** Convert to plain JavaScript array */
	toArray(): T[];
	/** Convert to JSON (alias for toArray) */
	toJSON(): T[];
	/** Subscribe to deep changes (this array and all nested structures) */
	onDeepChange(handler: (changes: DeepChange[], origin: ChangeOrigin) => void): Unsubscribe;
}

/**
 * CRDT Map data structure - a key-value store with deep change observation.
 *
 * Supports nested CRDT structures: get() returns CRDTMap/CRDTArray if that's
 * what was stored, otherwise returns plain values. Use toJSON() to convert
 * the entire structure to plain objects.
 */
export interface CRDTMap<T = unknown> {
	/** Get value by key. Returns CRDTMap/CRDTArray if stored, otherwise plain value. */
	get(key: string): T | CRDTMap<unknown> | CRDTArray<unknown> | undefined;
	/** Set value for key */
	set(key: string, value: T | CRDTMap<unknown> | CRDTArray<unknown>): void;
	/** Delete key */
	delete(key: string): void;
	/** Check if key exists */
	has(key: string): boolean;
	/** Get all keys */
	keys(): IterableIterator<string>;
	/** Get all values (includes CRDTMap/CRDTArray instances) */
	values(): IterableIterator<T | CRDTMap<unknown> | CRDTArray<unknown>>;
	/** Get all entries (includes CRDTMap/CRDTArray instances) */
	entries(): IterableIterator<[string, T | CRDTMap<unknown> | CRDTArray<unknown>]>;
	/** Convert to plain JSON object (recursively converts nested CRDT types) */
	toJSON(): Record<string, T>;
	/** Subscribe to deep changes (this map and all nested structures) */
	onDeepChange(handler: (changes: DeepChange[], origin: ChangeOrigin) => void): Unsubscribe;
}

/**
 * CRDT Document - container for multiple CRDT data structures.
 */
export interface CRDTDoc {
	/** Unique document identifier */
	readonly id: string;
	/**
	 * Whether the document has completed initial sync with remote peers.
	 * True when SyncStep2 has been received (like y-websocket's synced property).
	 */
	readonly synced: boolean;
	/** Get or create a named Map at the document root */
	getMap<T = unknown>(name: string): CRDTMap<T>;
	/** Get or create a named Array at the document root */
	getArray<T = unknown>(name: string): CRDTArray<T>;
	/** Create a standalone CRDTMap that can be stored in other maps/arrays */
	createMap<T = unknown>(): CRDTMap<T>;
	/** Create a standalone CRDTArray that can be stored in other maps/arrays */
	createArray<T = unknown>(): CRDTArray<T>;
	/** Execute changes in a transaction (batched, atomic) */
	transact(fn: () => void): void;
	/** Encode the full document state as a binary update */
	encodeState(): Uint8Array;
	/**
	 * Encode the state vector as a compact binary representation.
	 * State vectors are small fingerprints (~100 bytes) that represent
	 * which updates have been applied to the document.
	 * Useful for efficient change detection - compare vectors to check if state changed.
	 */
	encodeStateVector(): Uint8Array;
	/** Apply an update (or full state) from another document */
	applyUpdate(update: Uint8Array): void;
	/** Subscribe to outgoing updates. Only fires for local changes (origin='local'). */
	onUpdate(handler: (update: Uint8Array, origin: ChangeOrigin) => void): Unsubscribe;
	/**
	 * Subscribe to sync state changes.
	 * Like y-websocket's 'sync' event - fires when initial sync completes or connection is lost.
	 * @param handler Called with true when synced, false when disconnected
	 */
	onSync(handler: (isSynced: boolean) => void): Unsubscribe;
	/**
	 * Mark the document as synced or not synced.
	 * Called by transport/provider when sync state changes.
	 */
	setSynced(synced: boolean): void;
	/**
	 * Get the awareness instance for this document.
	 * Awareness is created lazily on first access.
	 * Used for ephemeral state like presence and cursors.
	 */
	getAwareness<T extends AwarenessState = AwarenessState>(): CRDTAwareness<T>;
	/**
	 * Create an undo manager for this document.
	 * Tracks all local changes and provides undo/redo functionality.
	 *
	 * Only one undo manager should be active per document.
	 * Remote changes are not tracked and do not affect the undo/redo stacks.
	 *
	 * @param options Configuration options
	 * @returns A new undo manager instance
	 */
	createUndoManager(options?: UndoManagerOptions): CRDTUndoManager;
	/** Clean up resources */
	destroy(): void;
}

/**
 * CRDT Provider - factory for creating documents.
 */
export interface CRDTProvider {
	/** Provider name (for logging/debugging) */
	readonly name: string;
	/** Create a new document */
	createDoc(id: string): CRDTDoc;
}

/**
 * Available CRDT engine types.
 */
export const CRDTEngine = {
	yjs: 'yjs',
} as const;

export type CRDTEngine = (typeof CRDTEngine)[keyof typeof CRDTEngine];

/**
 * Configuration for creating a CRDT provider.
 */
export interface CRDTConfig {
	/** Which CRDT engine to use */
	engine: CRDTEngine;
}

// =============================================================================
// Awareness Types
// =============================================================================

/**
 * Unique identifier for a client/user in the awareness system.
 * Each browser tab or connection gets its own client ID.
 */
export type AwarenessClientId = number;

/**
 * User-defined awareness state. Typically includes user info and cursor/selection.
 * The shape is defined by the application.
 *
 * @example
 * ```typescript
 * interface MyAwarenessState {
 *   user: { name: string; color: string };
 *   cursor?: { nodeId: string; position: { x: number; y: number } };
 * }
 * ```
 */
export type AwarenessState = Record<string, unknown>;

/**
 * Event emitted when awareness states change.
 * Contains arrays of client IDs that were added, updated, or removed.
 */
export interface AwarenessChangeEvent {
	/** Clients that came online or became visible */
	added: AwarenessClientId[];
	/** Clients whose state was updated */
	updated: AwarenessClientId[];
	/** Clients that went offline or were removed */
	removed: AwarenessClientId[];
}

/**
 * CRDT Awareness - ephemeral state for user presence and cursors.
 *
 * Awareness is separate from the persistent CRDT document. It's used for:
 * - User presence (who is online)
 * - Cursor positions
 * - Selection highlights
 * - Typing indicators
 *
 * Unlike document state, awareness is ephemeral and not persisted.
 * Clients are automatically marked offline after a timeout (typically 30s).
 */
export interface CRDTAwareness<T extends AwarenessState = AwarenessState> {
	/** This client's unique identifier */
	readonly clientId: AwarenessClientId;

	/**
	 * Get this client's current awareness state.
	 * Returns null if the client has been marked offline.
	 */
	getLocalState(): T | null;

	/**
	 * Set this client's awareness state.
	 * Pass null to mark this client as offline.
	 * State is immediately broadcast to other clients.
	 */
	setLocalState(state: T | null): void;

	/**
	 * Update a single field in the local awareness state.
	 * Does nothing if local state is null.
	 * More efficient than setLocalState for partial updates.
	 */
	setLocalStateField<K extends keyof T>(field: K, value: T[K]): void;

	/**
	 * Get all awareness states (local and remote).
	 * Maps from client ID to their awareness state.
	 * Clients marked offline are not included.
	 */
	getStates(): Map<AwarenessClientId, T>;

	/**
	 * Subscribe to awareness changes.
	 * Called when clients come online, update state, or go offline.
	 * The 'origin' parameter indicates the source of the change.
	 */
	onChange(handler: (event: AwarenessChangeEvent, origin: ChangeOrigin) => void): Unsubscribe;

	/**
	 * Encode awareness state for specific clients as binary.
	 * Used for sending awareness updates over the network.
	 * If no clients specified, encodes all known clients.
	 */
	encodeState(clients?: AwarenessClientId[]): Uint8Array;

	/**
	 * Apply an awareness update received from the network.
	 */
	applyUpdate(update: Uint8Array): void;

	/**
	 * Subscribe to outgoing awareness updates.
	 * Fires when local state changes and needs to be sent to peers.
	 */
	onUpdate(handler: (update: Uint8Array, origin: ChangeOrigin) => void): Unsubscribe;

	/**
	 * Mark specific clients as offline/removed.
	 * Useful when a peer disconnects.
	 */
	removeStates(clients: AwarenessClientId[]): void;

	/**
	 * Clean up resources.
	 * Marks this client as offline and removes all handlers.
	 */
	destroy(): void;
}

// =============================================================================
// Undo Manager Types
// =============================================================================

/**
 * Options for creating an undo manager.
 */
export interface UndoManagerOptions {
	/**
	 * Time in milliseconds to group consecutive changes into a single undo item.
	 * Changes made within this window are merged into one undoable operation.
	 * @default 500
	 */
	captureTimeout?: number;
}

/**
 * Event data emitted when the undo/redo stack changes.
 */
export interface UndoStackChangeEvent {
	/** Whether undo is currently possible */
	canUndo: boolean;
	/** Whether redo is currently possible */
	canRedo: boolean;
}

/**
 * CRDT Undo Manager - provides undo/redo functionality for document changes.
 *
 * Only tracks local changes (not remote peer changes from sync).
 * Remote changes do NOT clear the redo stack, allowing proper collaborative undo.
 *
 * @example
 * ```typescript
 * const undoManager = doc.createUndoManager({ captureTimeout: 500 });
 *
 * // Make changes
 * doc.getMap('data').set('key', 'value');
 *
 * // Undo the change
 * if (undoManager.canUndo()) {
 *   undoManager.undo();
 * }
 *
 * // Clean up
 * undoManager.destroy();
 * ```
 */
export interface CRDTUndoManager {
	/**
	 * Undo the last undoable change.
	 * @returns true if an undo was performed, false if nothing to undo
	 */
	undo(): boolean;

	/**
	 * Redo the last undone change.
	 * @returns true if a redo was performed, false if nothing to redo
	 */
	redo(): boolean;

	/**
	 * Check if undo is possible.
	 */
	canUndo(): boolean;

	/**
	 * Check if redo is possible.
	 */
	canRedo(): boolean;

	/**
	 * Force the next change to start a new undo item instead of merging
	 * with the previous one. Useful for marking logical boundaries
	 * (e.g., after user completes an operation).
	 */
	stopCapturing(): void;

	/**
	 * Clear the entire undo and redo history.
	 */
	clear(): void;

	/**
	 * Subscribe to stack changes. Called when canUndo/canRedo state changes.
	 * Useful for updating UI button states.
	 *
	 * @param handler Called when stack state changes
	 * @returns Unsubscribe function
	 */
	onStackChange(handler: (event: UndoStackChangeEvent) => void): Unsubscribe;

	/**
	 * Store metadata on the current undo item.
	 * Useful for storing cursor/selection state to restore after undo.
	 *
	 * @param key Metadata key
	 * @param value Metadata value
	 */
	setMeta<V>(key: string, value: V): void;

	/**
	 * Retrieve metadata from the most recently undone/redone item.
	 * Returns undefined if no metadata exists for the key.
	 *
	 * @param key Metadata key
	 * @returns The stored value or undefined
	 */
	getMeta<V>(key: string): V | undefined;

	/**
	 * Clean up resources. The undo manager cannot be used after calling destroy.
	 */
	destroy(): void;
}
