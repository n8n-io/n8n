import * as Y from 'yjs';

import { YjsAwareness } from '../awareness/yjs-awareness';
import type {
	ArrayChangeEvent,
	AwarenessState,
	CRDTArray,
	CRDTAwareness,
	CRDTDoc,
	CRDTMap,
	CRDTProvider,
	CRDTUndoManager,
	DeepChange,
	DeepChangeEvent,
	UndoManagerOptions,
	Unsubscribe,
} from '../types';
import { ChangeAction, ChangeOrigin, CRDTEngine } from '../types';
import { YjsRemoteOrigin, YjsUndoManager, YjsUndoManagerOrigin } from '../undo/yjs-undo-manager';

/**
 * Determine the ChangeOrigin from a Yjs transaction.
 * - UndoManager transactions (origin is Y.UndoManager instance) → undoRedo
 * - Local transactions → local
 * - Remote transactions → remote
 */
function getChangeOrigin(transaction: Y.Transaction): ChangeOrigin {
	// Undo/redo transactions have the UndoManager instance as origin
	if (transaction.origin instanceof Y.UndoManager) {
		return ChangeOrigin.undoRedo;
	}
	return transaction.local ? ChangeOrigin.local : ChangeOrigin.remote;
}

/**
 * Convert a value to JSON if it's a Yjs type, otherwise return as-is.
 * Used for toJSON() methods to get plain objects.
 */
function toJSONValue(value: unknown): unknown {
	if (value instanceof Y.Map || value instanceof Y.Array || value instanceof Y.Text) {
		return value.toJSON();
	}
	return value;
}

/** Symbol to store wrapper reference directly on Y types */
const WRAPPER = Symbol('crdt-wrapper');

/** Type extension for Y types to store wrapper reference */
type YTypeWithWrapper = { [WRAPPER]?: YjsMap | YjsArray };

/**
 * Wrap a Yjs type in the appropriate CRDT wrapper, or return primitive as-is.
 * Stores wrapper on the Y type itself to return the same instance on every get().
 */
function wrapYjsValue(value: unknown): unknown {
	if (value instanceof Y.Map) {
		// Store wrapper on the Y.Map itself for identity preservation
		const yMap = value as Y.Map<unknown> & YTypeWithWrapper;
		yMap[WRAPPER] ??= new YjsMap(value);
		return yMap[WRAPPER];
	}
	if (value instanceof Y.Array) {
		// Store wrapper on the Y.Array itself for identity preservation
		const yArray = value as Y.Array<unknown> & YTypeWithWrapper;
		yArray[WRAPPER] ??= new YjsArray(value);
		return yArray[WRAPPER];
	}
	return value;
}

/**
 * Yjs implementation of CRDTArray.
 */
class YjsArray<T = unknown> implements CRDTArray<T> {
	constructor(private readonly yArray: Y.Array<unknown>) {}

	/** Get the underlying Y.Array (for internal use) */
	getYArray(): Y.Array<unknown> {
		return this.yArray;
	}

	get length(): number {
		return this.yArray.length;
	}

	get(index: number): T | undefined {
		const value = this.yArray.get(index);
		return wrapYjsValue(value) as T | undefined;
	}

	push(...items: T[]): void {
		// Convert wrappers to their underlying Y types
		const unwrapped = items.map((item) => {
			if (item instanceof YjsMap) return item.getYMap();
			if (item instanceof YjsArray) return item.getYArray();
			return item;
		});
		this.yArray.push(unwrapped);
	}

	insert(index: number, ...items: T[]): void {
		// Convert wrappers to their underlying Y types
		const unwrapped = items.map((item) => {
			if (item instanceof YjsMap) return item.getYMap();
			if (item instanceof YjsArray) return item.getYArray();
			return item;
		});
		this.yArray.insert(index, unwrapped);
	}

	delete(index: number, count = 1): void {
		this.yArray.delete(index, count);
	}

	toArray(): T[] {
		return this.yArray.toJSON() as T[];
	}

	toJSON(): T[] {
		return this.toArray();
	}

	onDeepChange(handler: (changes: DeepChange[], origin: ChangeOrigin) => void): Unsubscribe {
		const observer = (events: Array<Y.YEvent<Y.Array<unknown>>>, transaction: Y.Transaction) => {
			const changes: DeepChange[] = [];

			for (const event of events) {
				if (event instanceof Y.YArrayEvent) {
					// Pass through Yjs delta format directly
					changes.push(arrayEventToChange(event));
				} else if (event instanceof Y.YMapEvent) {
					changes.push(...mapEventToChanges(event));
				}
			}

			if (changes.length > 0) {
				handler(changes, getChangeOrigin(transaction));
			}
		};

		this.yArray.observeDeep(observer);

		return () => {
			this.yArray.unobserveDeep(observer);
		};
	}
}

/**
 * Convert Yjs array event to ArrayChangeEvent (pass-through delta format).
 */
function arrayEventToChange(event: Y.YArrayEvent<unknown>): ArrayChangeEvent {
	return {
		path: event.path,
		delta: event.delta as ArrayChangeEvent['delta'],
	};
}

/**
 * Convert Yjs map events to DeepChangeEvents.
 */
function mapEventToChanges(event: Y.YMapEvent<unknown>): DeepChangeEvent[] {
	return Array.from(event.changes.keys, ([key, change]) => ({
		path: [...event.path, key],
		action: change.action,
		...(change.action !== ChangeAction.delete && {
			value: toJSONValue(event.target.get(key)),
		}),
		...(change.action !== ChangeAction.add && {
			oldValue: toJSONValue(change.oldValue),
		}),
	}));
}

/**
 * Yjs implementation of CRDTMap.
 */
class YjsMap<T = unknown> implements CRDTMap<T> {
	constructor(private readonly yMap: Y.Map<unknown>) {}

	/** Get the underlying Y.Map (for internal use) */
	getYMap(): Y.Map<unknown> {
		return this.yMap;
	}

	get(key: string): T | CRDTMap<unknown> | CRDTArray<unknown> | undefined {
		const value = this.yMap.get(key);
		return wrapYjsValue(value) as T | CRDTMap<unknown> | CRDTArray<unknown> | undefined;
	}

	set(key: string, value: T | CRDTMap<unknown> | CRDTArray<unknown>): void {
		// Convert wrappers to their underlying Y types
		if (value instanceof YjsMap) {
			this.yMap.set(key, value.getYMap());
		} else if (value instanceof YjsArray) {
			this.yMap.set(key, value.getYArray());
		} else {
			this.yMap.set(key, value);
		}
	}

	delete(key: string): void {
		this.yMap.delete(key);
	}

	has(key: string): boolean {
		return this.yMap.has(key);
	}

	keys(): IterableIterator<string> {
		return this.yMap.keys();
	}

	*values(): IterableIterator<T | CRDTMap<unknown> | CRDTArray<unknown>> {
		for (const value of this.yMap.values()) {
			yield wrapYjsValue(value) as T | CRDTMap<unknown> | CRDTArray<unknown>;
		}
	}

	*entries(): IterableIterator<[string, T | CRDTMap<unknown> | CRDTArray<unknown>]> {
		for (const [key, value] of this.yMap.entries()) {
			yield [key, wrapYjsValue(value) as T | CRDTMap<unknown> | CRDTArray<unknown>];
		}
	}

	toJSON(): Record<string, T> {
		return this.yMap.toJSON() as Record<string, T>;
	}

	onDeepChange(handler: (changes: DeepChange[], origin: ChangeOrigin) => void): Unsubscribe {
		const observer = (events: Array<Y.YEvent<Y.Map<unknown>>>, transaction: Y.Transaction) => {
			const changes: DeepChange[] = [];

			for (const event of events) {
				if (event instanceof Y.YArrayEvent) {
					changes.push(arrayEventToChange(event));
				} else if (event instanceof Y.YMapEvent) {
					changes.push(...mapEventToChanges(event));
				}
			}

			if (changes.length > 0) {
				handler(changes, getChangeOrigin(transaction));
			}
		};

		this.yMap.observeDeep(observer);

		return () => {
			this.yMap.unobserveDeep(observer);
		};
	}
}

/**
 * Yjs implementation of CRDTDoc.
 */
class YjsDoc implements CRDTDoc {
	private readonly yDoc: Y.Doc;
	private awareness: YjsAwareness | null = null;
	private undoManager: YjsUndoManager | null = null;
	private _synced = false;
	private syncHandlers = new Set<(isSynced: boolean) => void>();

	constructor(readonly id: string) {
		this.yDoc = new Y.Doc({ guid: id });
	}

	get synced(): boolean {
		return this._synced;
	}

	setSynced(synced: boolean): void {
		if (this._synced === synced) return;
		this._synced = synced;
		for (const handler of this.syncHandlers) {
			handler(synced);
		}
	}

	onSync(handler: (isSynced: boolean) => void): () => void {
		this.syncHandlers.add(handler);
		return () => {
			this.syncHandlers.delete(handler);
		};
	}

	getMap<T = unknown>(name: string): CRDTMap<T> {
		return wrapYjsValue(this.yDoc.getMap(name)) as CRDTMap<T>;
	}

	getArray<T = unknown>(name: string): CRDTArray<T> {
		return wrapYjsValue(this.yDoc.getArray(name)) as CRDTArray<T>;
	}

	createMap<T = unknown>(): CRDTMap<T> {
		// Return a wrapped standalone Y.Map - Yjs buffers writes internally until attached
		return new YjsMap<T>(new Y.Map<unknown>());
	}

	createArray<T = unknown>(): CRDTArray<T> {
		// Return a wrapped standalone Y.Array - Yjs buffers writes internally until attached
		return new YjsArray<T>(new Y.Array<unknown>());
	}

	transact(fn: () => void): void {
		// Use the tracked origin so undo manager captures these changes
		this.yDoc.transact(fn, YjsUndoManagerOrigin);
	}

	encodeState(): Uint8Array {
		return Y.encodeStateAsUpdate(this.yDoc);
	}

	encodeStateVector(): Uint8Array {
		return Y.encodeStateVector(this.yDoc);
	}

	applyUpdate(update: Uint8Array): void {
		// Use remote origin so undo manager doesn't track these changes
		Y.applyUpdate(this.yDoc, update, YjsRemoteOrigin);
	}

	onUpdate(handler: (update: Uint8Array, origin: ChangeOrigin) => void): Unsubscribe {
		const wrappedHandler = (
			update: Uint8Array,
			_origin: unknown,
			_doc: Y.Doc,
			transaction: Y.Transaction,
		) => {
			handler(update, getChangeOrigin(transaction));
		};
		this.yDoc.on('update', wrappedHandler);
		return () => {
			this.yDoc.off('update', wrappedHandler);
		};
	}

	getAwareness<T extends AwarenessState = AwarenessState>(): CRDTAwareness<T> {
		this.awareness ??= new YjsAwareness(this.yDoc);
		return this.awareness as unknown as CRDTAwareness<T>;
	}

	createUndoManager(options?: UndoManagerOptions): CRDTUndoManager {
		if (this.undoManager) {
			throw new Error('Undo manager already exists for this document');
		}
		this.undoManager = new YjsUndoManager(this.yDoc, options);
		return this.undoManager;
	}

	destroy(): void {
		if (this.undoManager) {
			this.undoManager.destroy();
			this.undoManager = null;
		}
		if (this.awareness) {
			this.awareness.destroy();
			this.awareness = null;
		}
		this.syncHandlers.clear();
		this._synced = false;
		this.yDoc.destroy();
	}
}

/**
 * Yjs implementation of CRDTProvider.
 */
export class YjsProvider implements CRDTProvider {
	readonly name = CRDTEngine.yjs;

	createDoc(id: string): CRDTDoc {
		return new YjsDoc(id);
	}
}
