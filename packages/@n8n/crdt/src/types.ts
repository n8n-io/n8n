/**
 * Function returned by event subscriptions to unsubscribe from events.
 */
export type Unsubscribe = () => void;

/**
 * Change action types for deep change events.
 */
export const ChangeAction = {
	Add: 'add',
	Update: 'update',
	Delete: 'delete',
} as const;

export type ChangeAction = (typeof ChangeAction)[keyof typeof ChangeAction];

/**
 * Represents a deep change event emitted when nested data in a CRDT structure changes.
 * This unified format works identically for both Yjs and Automerge providers.
 */
export interface DeepChangeEvent {
	/** Full path to changed value, e.g., ['node-1', 'position', 'x'] */
	path: (string | number)[];
	/** Type of change */
	action: ChangeAction;
	/** New value (for add/update) */
	value?: unknown;
	/** Previous value (for update/delete) */
	oldValue?: unknown;
}

/**
 * CRDT Map data structure - a key-value store with deep change observation.
 * When getting a nested object, returns a CRDTMap wrapper for that object.
 */
export interface CRDTMap<T = unknown> {
	/** Get value by key. Returns CRDTMap for nested objects, primitive value otherwise. */
	get(key: string): T | CRDTMap<unknown> | undefined;
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
	/** Subscribe to deep changes (nested property changes) */
	onDeepChange(handler: (changes: DeepChangeEvent[]) => void): Unsubscribe;
}

/**
 * CRDT Document - container for multiple CRDT data structures.
 */
export interface CRDTDoc {
	/** Unique document identifier */
	readonly id: string;
	/** Get or create a named Map */
	getMap<T = unknown>(name: string): CRDTMap<T>;
	/** Execute changes in a transaction (batched, atomic) */
	transact(fn: () => void): void;
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
	Yjs: 'yjs',
	Automerge: 'automerge',
} as const;

export type CRDTEngine = (typeof CRDTEngine)[keyof typeof CRDTEngine];

/**
 * Configuration for creating a CRDT provider.
 */
export interface CRDTConfig {
	/** Which CRDT engine to use */
	engine: CRDTEngine;
}
