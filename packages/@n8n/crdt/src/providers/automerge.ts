import * as Automerge from '@automerge/automerge';

import type { CRDTDoc, CRDTMap, CRDTProvider, DeepChangeEvent, Unsubscribe } from '../types';
import { ChangeAction, CRDTEngine } from '../types';

type AutomergeDoc = Automerge.Doc<Record<string, unknown>>;
type ChangeHandler = (changes: DeepChangeEvent[]) => void;

/**
 * Automerge implementation of CRDTMap.
 * This is a wrapper that allows get/set operations on a specific path within the document.
 */
class AutomergeMap<T = unknown> implements CRDTMap<T> {
	constructor(
		private readonly docHolder: AutomergeDocHolder,
		private readonly mapName: string,
	) {}

	private getMapData(): Record<string, unknown> {
		const doc = this.docHolder.getDoc();
		return (doc[this.mapName] as Record<string, unknown>) ?? {};
	}

	get(key: string): T | CRDTMap<unknown> | undefined {
		const mapData = this.getMapData();
		const value = mapData[key];

		// If value is an object (not null, not array), return a nested AutomergeMap
		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			return new AutomergeNestedMap(this.docHolder, this.mapName, [key]) as CRDTMap<unknown>;
		}

		return value as T | undefined;
	}

	set(key: string, value: T): void {
		this.docHolder.change((doc) => {
			doc[this.mapName] ??= {};
			(doc[this.mapName] as Record<string, unknown>)[key] = value;
		});
	}

	delete(key: string): void {
		this.docHolder.change((doc) => {
			if (doc[this.mapName]) {
				delete (doc[this.mapName] as Record<string, unknown>)[key];
			}
		});
	}

	has(key: string): boolean {
		const mapData = this.getMapData();
		return key in mapData;
	}

	keys(): IterableIterator<string> {
		const mapData = this.getMapData();
		return Object.keys(mapData)[Symbol.iterator]();
	}

	*values(): IterableIterator<T> {
		const mapData = this.getMapData();
		for (const value of Object.values(mapData)) {
			yield value as T;
		}
	}

	*entries(): IterableIterator<[string, T]> {
		const mapData = this.getMapData();
		for (const [key, value] of Object.entries(mapData)) {
			yield [key, value as T];
		}
	}

	toJSON(): Record<string, T> {
		return { ...this.getMapData() } as Record<string, T>;
	}

	onDeepChange(handler: ChangeHandler): Unsubscribe {
		this.docHolder.addChangeHandler(this.mapName, handler);
		return () => {
			this.docHolder.removeChangeHandler(this.mapName, handler);
		};
	}
}

/**
 * Nested map for accessing deep paths within an Automerge document.
 */
class AutomergeNestedMap<T = unknown> implements CRDTMap<T> {
	constructor(
		private readonly docHolder: AutomergeDocHolder,
		private readonly mapName: string,
		private readonly path: Array<string | number>,
	) {}

	private getNestedData(): Record<string, unknown> | undefined {
		const doc = this.docHolder.getDoc();
		let current: unknown = doc[this.mapName];

		for (const segment of this.path) {
			if (current === null || current === undefined) {
				return undefined;
			}
			current = (current as Record<string, unknown>)[segment as string];
		}

		return current as Record<string, unknown> | undefined;
	}

	get(key: string): T | CRDTMap<unknown> | undefined {
		const data = this.getNestedData();
		if (!data) return undefined;

		const value = data[key];

		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			return new AutomergeNestedMap(this.docHolder, this.mapName, [
				...this.path,
				key,
			]) as CRDTMap<unknown>;
		}

		return value as T | undefined;
	}

	set(key: string, value: T): void {
		this.docHolder.change((doc) => {
			let current: Record<string, unknown> = doc[this.mapName] as Record<string, unknown>;

			for (const segment of this.path) {
				if (!current[segment as string]) {
					current[segment as string] = {};
				}
				current = current[segment as string] as Record<string, unknown>;
			}

			current[key] = value;
		});
	}

	delete(key: string): void {
		this.docHolder.change((doc) => {
			let current: Record<string, unknown> = doc[this.mapName] as Record<string, unknown>;

			for (const segment of this.path) {
				if (!current[segment as string]) return;
				current = current[segment as string] as Record<string, unknown>;
			}

			delete current[key];
		});
	}

	has(key: string): boolean {
		const data = this.getNestedData();
		return data !== undefined && key in data;
	}

	keys(): IterableIterator<string> {
		const data = this.getNestedData();
		return Object.keys(data ?? {})[Symbol.iterator]();
	}

	*values(): IterableIterator<T> {
		const data = this.getNestedData();
		if (data) {
			for (const value of Object.values(data)) {
				yield value as T;
			}
		}
	}

	*entries(): IterableIterator<[string, T]> {
		const data = this.getNestedData();
		if (data) {
			for (const [key, value] of Object.entries(data)) {
				yield [key, value as T];
			}
		}
	}

	toJSON(): Record<string, T> {
		return { ...(this.getNestedData() ?? {}) } as Record<string, T>;
	}

	onDeepChange(handler: ChangeHandler): Unsubscribe {
		// Nested maps share the same change handlers via the docHolder
		this.docHolder.addChangeHandler(this.mapName, handler);
		return () => {
			this.docHolder.removeChangeHandler(this.mapName, handler);
		};
	}
}

/**
 * Holds the Automerge document and manages change handlers.
 */
class AutomergeDocHolder {
	private doc: AutomergeDoc;
	private changeHandlers: Map<string, Set<ChangeHandler>> = new Map();
	private inTransaction = false;
	private transactionBeforeHeads: Automerge.Heads | null = null;

	constructor(readonly id: string) {
		this.doc = Automerge.init();
	}

	getDoc(): AutomergeDoc {
		return this.doc;
	}

	getHeads(): Automerge.Heads {
		return Automerge.getHeads(this.doc);
	}

	change(fn: (doc: Record<string, unknown>) => void): void {
		const beforeHeads = this.inTransaction ? null : this.getHeads();
		this.doc = Automerge.change(this.doc, fn);

		if (!this.inTransaction && beforeHeads) {
			this.notifyHandlers(beforeHeads);
		}
	}

	startTransaction(): void {
		this.inTransaction = true;
		this.transactionBeforeHeads = this.getHeads();
	}

	endTransaction(): void {
		this.inTransaction = false;
		if (this.transactionBeforeHeads) {
			this.notifyHandlers(this.transactionBeforeHeads);
			this.transactionBeforeHeads = null;
		}
	}

	private notifyHandlers(beforeHeads: Automerge.Heads): void {
		const afterHeads = this.getHeads();
		const patches = Automerge.diff(this.doc, beforeHeads, afterHeads);

		// Group patches by map name, filtering out map container creation patches
		const patchesByMap = new Map<string, typeof patches>();
		for (const patch of patches) {
			// Skip patches with only 1 path segment (map container creation)
			// These are internal to how we structure the document
			if (patch.path.length <= 1) continue;

			const mapName = patch.path[0] as string;
			if (!patchesByMap.has(mapName)) {
				patchesByMap.set(mapName, []);
			}
			patchesByMap.get(mapName)!.push(patch);
		}

		// Notify handlers for each map
		for (const [mapName, mapPatches] of patchesByMap) {
			const handlers = this.changeHandlers.get(mapName);
			if (!handlers || handlers.size === 0) continue;

			// Collapse patches that are children of other patches with empty object values
			// This handles the case where setting { position: { x: 150 } } creates multiple patches
			const collapsedPatches = this.collapseObjectPatches(mapPatches, mapName);

			const changes: DeepChangeEvent[] = collapsedPatches.map((patch) => {
				const path = patch.path.slice(1);
				const action =
					patch.action === 'del'
						? ChangeAction.delete
						: this.wasKeyExisting(mapName, path, beforeHeads)
							? ChangeAction.update
							: ChangeAction.add;

				return {
					path,
					action,
					...(patch.action !== 'del' && 'value' in patch && { value: patch.value }),
					...(action !== ChangeAction.add && {
						oldValue: this.getOldValue(mapName, path, beforeHeads),
					}),
				};
			});

			if (changes.length > 0) {
				for (const handler of handlers) {
					handler(changes);
				}
			}
		}
	}

	/**
	 * Collapse patches where a parent path has an empty object value.
	 * Automerge emits separate patches for object creation and property setting,
	 * but we want a single patch with the full object value.
	 */
	private collapseObjectPatches(patches: Automerge.Patch[], mapName: string): Automerge.Patch[] {
		// Find patches that are parent object creations (value is empty object)
		const parentPaths = new Set<string>();
		for (const patch of patches) {
			if (
				patch.action === 'put' &&
				'value' in patch &&
				typeof patch.value === 'object' &&
				patch.value !== null &&
				Object.keys(patch.value).length === 0
			) {
				const pathKey = patch.path.slice(1).join('/');
				parentPaths.add(pathKey);
			}
		}

		if (parentPaths.size === 0) {
			return patches;
		}

		// Find the shortest parent paths (top-level object creations)
		const topLevelParents: string[] = [];
		const sortedParents = Array.from(parentPaths).sort((a, b) => a.length - b.length);
		for (const path of sortedParents) {
			const isChild = topLevelParents.some(
				(parent) => path.startsWith(parent + '/') || path === parent,
			);
			if (!isChild) {
				topLevelParents.push(path);
			}
		}

		// Filter out patches that are children of top-level parents
		// and update the parent patch with the full object value
		const result: Automerge.Patch[] = [];
		for (const patch of patches) {
			const pathKey = patch.path.slice(1).join('/');

			// Check if this is a top-level parent
			if (topLevelParents.includes(pathKey)) {
				// Get the full object value from the current document
				const fullValue = this.getValueAtPath(mapName, patch.path.slice(1));
				result.push({
					...patch,
					value: fullValue,
				} as Automerge.Patch);
				continue;
			}

			// Check if this is a child of a top-level parent
			const isChildOfParent = topLevelParents.some((parent) => pathKey.startsWith(parent + '/'));
			if (!isChildOfParent) {
				result.push(patch);
			}
		}

		return result;
	}

	private getValueAtPath(mapName: string, path: Array<string | number>): unknown {
		let current: unknown = this.doc[mapName];
		for (const segment of path) {
			if (current === null || current === undefined) return undefined;
			current = (current as Record<string, unknown>)[segment as string];
		}
		return current;
	}

	private getOldValue(
		mapName: string,
		path: Array<string | number>,
		beforeHeads: Automerge.Heads,
	): unknown {
		try {
			const beforeDoc = Automerge.view(this.doc, beforeHeads);
			let current: unknown = beforeDoc[mapName];
			for (const segment of path) {
				if (current === null || current === undefined) return undefined;
				current = (current as Record<string, unknown>)[segment as string];
			}
			return current;
		} catch {
			return undefined;
		}
	}

	private wasKeyExisting(
		mapName: string,
		path: Array<string | number>,
		beforeHeads: Automerge.Heads,
	): boolean {
		try {
			const beforeDoc = Automerge.view(this.doc, beforeHeads);
			let current: unknown = beforeDoc[mapName];

			for (let i = 0; i < path.length - 1; i++) {
				if (current === null || current === undefined) return false;
				current = (current as Record<string, unknown>)[path[i] as string];
			}

			if (current === null || current === undefined) return false;
			const lastKey = path[path.length - 1] as string;
			return lastKey in (current as Record<string, unknown>);
		} catch {
			return false;
		}
	}

	addChangeHandler(mapName: string, handler: ChangeHandler): void {
		if (!this.changeHandlers.has(mapName)) {
			this.changeHandlers.set(mapName, new Set());
		}
		this.changeHandlers.get(mapName)!.add(handler);
	}

	removeChangeHandler(mapName: string, handler: ChangeHandler): void {
		const handlers = this.changeHandlers.get(mapName);
		if (handlers) {
			handlers.delete(handler);
		}
	}

	destroy(): void {
		this.changeHandlers.clear();
	}
}

/**
 * Automerge implementation of CRDTDoc.
 */
class AutomergeDocImpl implements CRDTDoc {
	private readonly docHolder: AutomergeDocHolder;
	private readonly maps = new Map<string, AutomergeMap<unknown>>();

	constructor(readonly id: string) {
		this.docHolder = new AutomergeDocHolder(id);
	}

	getMap<T = unknown>(name: string): CRDTMap<T> {
		let map = this.maps.get(name);
		if (!map) {
			map = new AutomergeMap<unknown>(this.docHolder, name);
			this.maps.set(name, map);
		}
		return map as CRDTMap<T>;
	}

	transact(fn: () => void): void {
		this.docHolder.startTransaction();
		try {
			fn();
		} finally {
			this.docHolder.endTransaction();
		}
	}

	destroy(): void {
		this.docHolder.destroy();
		this.maps.clear();
	}
}

/**
 * Automerge implementation of CRDTProvider.
 */
export class AutomergeProvider implements CRDTProvider {
	readonly name = CRDTEngine.automerge;

	createDoc(id: string): CRDTDoc {
		return new AutomergeDocImpl(id);
	}
}
