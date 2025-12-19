import * as Y from 'yjs';

import type {
	ArrayChangeEvent,
	CRDTArray,
	CRDTDoc,
	CRDTMap,
	CRDTProvider,
	DeepChange,
	DeepChangeEvent,
	Unsubscribe,
} from '../types';
import { ChangeAction, CRDTEngine } from '../types';

/**
 * Convert a value to JSON if it's a Yjs type, otherwise return as-is.
 */
function toJSONValue(value: unknown): unknown {
	if (value instanceof Y.Map || value instanceof Y.Array || value instanceof Y.Text) {
		return value.toJSON();
	}
	return value;
}

/**
 * Convert a plain JS object/array to nested Y.Map/Y.Array structures.
 */
function toYjsValue(value: unknown, doc: Y.Doc): unknown {
	if (value === null || value === undefined) {
		return value;
	}

	if (Array.isArray(value)) {
		const yArray = new Y.Array();
		for (const item of value) {
			yArray.push([toYjsValue(item, doc)]);
		}
		return yArray;
	}

	if (typeof value === 'object' && value.constructor === Object) {
		const yMap = new Y.Map();
		for (const [entryKey, entryValue] of Object.entries(value)) {
			yMap.set(entryKey, toYjsValue(entryValue, doc));
		}
		return yMap;
	}

	// Primitives (string, number, boolean)
	return value;
}

/**
 * Yjs implementation of CRDTArray.
 */
class YjsArray<T = unknown> implements CRDTArray<T> {
	constructor(
		private readonly yArray: Y.Array<unknown>,
		private readonly doc: Y.Doc,
	) {}

	get length(): number {
		return this.yArray.length;
	}

	get(index: number): T | CRDTMap<unknown> | CRDTArray<unknown> | undefined {
		const value = this.yArray.get(index);
		if (value instanceof Y.Map) {
			return new YjsMap(value, this.doc);
		}
		if (value instanceof Y.Array) {
			return new YjsArray(value, this.doc);
		}
		return value as T | undefined;
	}

	push(...items: T[]): void {
		const yItems = items.map((item) => toYjsValue(item, this.doc));
		this.yArray.push(yItems);
	}

	insert(index: number, ...items: T[]): void {
		const yItems = items.map((item) => toYjsValue(item, this.doc));
		this.yArray.insert(index, yItems);
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

	onDeepChange(handler: (changes: DeepChange[]) => void): Unsubscribe {
		const observer = (events: Array<Y.YEvent<Y.Array<unknown>>>) => {
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
				handler(changes);
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
	constructor(
		private readonly yMap: Y.Map<unknown>,
		private readonly doc: Y.Doc,
	) {}

	get(key: string): T | CRDTMap<unknown> | undefined {
		const value = this.yMap.get(key);
		if (value instanceof Y.Map) {
			return new YjsMap(value, this.doc);
		}
		return value as T | undefined;
	}

	set(key: string, value: T): void {
		const yValue = toYjsValue(value, this.doc);
		this.yMap.set(key, yValue);
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

	*values(): IterableIterator<T> {
		for (const value of this.yMap.values()) {
			yield toJSONValue(value) as T;
		}
	}

	*entries(): IterableIterator<[string, T]> {
		for (const [key, value] of this.yMap.entries()) {
			yield [key, toJSONValue(value) as T];
		}
	}

	toJSON(): Record<string, T> {
		return this.yMap.toJSON() as Record<string, T>;
	}

	onDeepChange(handler: (changes: DeepChange[]) => void): Unsubscribe {
		const observer = (events: Array<Y.YEvent<Y.Map<unknown>>>) => {
			const changes: DeepChange[] = [];

			for (const event of events) {
				if (event instanceof Y.YArrayEvent) {
					changes.push(arrayEventToChange(event));
				} else if (event instanceof Y.YMapEvent) {
					changes.push(...mapEventToChanges(event));
				}
			}

			if (changes.length > 0) {
				handler(changes);
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

	constructor(readonly id: string) {
		this.yDoc = new Y.Doc({ guid: id });
	}

	getMap<T = unknown>(name: string): CRDTMap<T> {
		return new YjsMap<T>(this.yDoc.getMap(name), this.yDoc);
	}

	getArray<T = unknown>(name: string): CRDTArray<T> {
		return new YjsArray<T>(this.yDoc.getArray(name), this.yDoc);
	}

	transact(fn: () => void): void {
		this.yDoc.transact(fn);
	}

	encodeState(): Uint8Array {
		return Y.encodeStateAsUpdate(this.yDoc);
	}

	applyUpdate(update: Uint8Array): void {
		Y.applyUpdate(this.yDoc, update);
	}

	onUpdate(handler: (update: Uint8Array) => void): Unsubscribe {
		const wrappedHandler = (update: Uint8Array) => {
			handler(update);
		};
		this.yDoc.on('update', wrappedHandler);
		return () => {
			this.yDoc.off('update', wrappedHandler);
		};
	}

	destroy(): void {
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
