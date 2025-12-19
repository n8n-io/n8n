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
 */
export interface CRDTArray<T = unknown> {
	/** Get the number of elements */
	readonly length: number;
	/** Get element at index. Returns CRDTMap/CRDTArray for nested objects/arrays. */
	get(index: number): T | CRDTMap<unknown> | CRDTArray<unknown> | undefined;
	/** Append element(s) to end */
	push(...items: T[]): void;
	/** Insert element(s) at index */
	insert(index: number, ...items: T[]): void;
	/** Delete count elements starting at index */
	delete(index: number, count?: number): void;
	/** Convert to plain JavaScript array */
	toArray(): T[];
	/** Convert to JSON (alias for toArray) */
	toJSON(): T[];
	/** Subscribe to deep changes (this array and all nested structures) */
	onDeepChange(handler: (changes: DeepChange[]) => void): Unsubscribe;
}

/**
 * CRDT Map data structure - a key-value store with deep change observation.
 * When getting a nested object, returns a CRDTMap wrapper for that object.
 */
export interface CRDTMap<T = unknown> {
	/** Get value by key. Returns CRDTMap/CRDTArray for nested objects/arrays. */
	get(key: string): T | CRDTMap<unknown> | CRDTArray<unknown> | undefined;
	/** Set value for key */
	set(key: string, value: T): void;
	/** Delete key */
	delete(key: string): void;
	/** Check if key exists */
	has(key: string): boolean;
	/** Get all keys */
	keys(): IterableIterator<string>;
	/** Get all values */
	values(): IterableIterator<T>;
	/** Get all entries */
	entries(): IterableIterator<[string, T]>;
	/** Convert to plain JSON object */
	toJSON(): Record<string, T>;
	/** Subscribe to deep changes (this map and all nested structures) */
	onDeepChange(handler: (changes: DeepChange[]) => void): Unsubscribe;
}

/**
 * CRDT Document - container for multiple CRDT data structures.
 */
export interface CRDTDoc {
	/** Unique document identifier */
	readonly id: string;
	/** Get or create a named Map */
	getMap<T = unknown>(name: string): CRDTMap<T>;
	/** Get or create a named Array */
	getArray<T = unknown>(name: string): CRDTArray<T>;
	/** Execute changes in a transaction (batched, atomic) */
	transact(fn: () => void): void;
	/** Encode the full document state as a binary update */
	encodeState(): Uint8Array;
	/** Apply an update (or full state) from another document */
	applyUpdate(update: Uint8Array): void;
	/** Subscribe to outgoing updates (for sending to peers) */
	onUpdate(handler: (update: Uint8Array) => void): Unsubscribe;
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
	automerge: 'automerge',
} as const;

export type CRDTEngine = (typeof CRDTEngine)[keyof typeof CRDTEngine];

/**
 * Configuration for creating a CRDT provider.
 */
export interface CRDTConfig {
	/** Which CRDT engine to use */
	engine: CRDTEngine;
}
