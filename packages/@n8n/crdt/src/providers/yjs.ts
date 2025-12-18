import * as Y from 'yjs';

import type { CRDTDoc, CRDTMap, CRDTProvider, DeepChangeEvent, Unsubscribe } from '../types';
import { CRDTEngine } from '../types';

/**
 * Yjs implementation of CRDTMap.
 */
class YjsMap<T = unknown> implements CRDTMap<T> {
	constructor(private readonly yMap: Y.Map<T>) {}

	get(key: string): T | undefined {
		return this.yMap.get(key);
	}

	set(key: string, value: T): void {
		this.yMap.set(key, value);
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

	values(): IterableIterator<T> {
		return this.yMap.values();
	}

	entries(): IterableIterator<[string, T]> {
		return this.yMap.entries();
	}

	toJSON(): Record<string, T> {
		return this.yMap.toJSON() as Record<string, T>;
	}

	onDeepChange(_handler: (changes: DeepChangeEvent[]) => void): Unsubscribe {
		// Stub - will be implemented in Step 0.4
		return () => {};
	}
}

/**
 * Yjs implementation of CRDTDoc.
 */
class YjsDoc implements CRDTDoc {
	private readonly yDoc: Y.Doc;
	private readonly maps = new Map<string, YjsMap<unknown>>();

	constructor(public readonly id: string) {
		this.yDoc = new Y.Doc({ guid: id });
	}

	getMap<T = unknown>(name: string): CRDTMap<T> {
		let map = this.maps.get(name);
		if (!map) {
			map = new YjsMap<unknown>(this.yDoc.getMap(name));
			this.maps.set(name, map);
		}
		return map as CRDTMap<T>;
	}

	transact(fn: () => void): void {
		this.yDoc.transact(fn);
	}

	destroy(): void {
		this.yDoc.destroy();
		this.maps.clear();
	}
}

/**
 * Yjs implementation of CRDTProvider.
 */
export class YjsProvider implements CRDTProvider {
	readonly name = CRDTEngine.Yjs;

	createDoc(id: string): CRDTDoc {
		return new YjsDoc(id);
	}
}
