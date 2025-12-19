import * as Automerge from '@automerge/automerge';

import type {
	ArrayChangeEvent,
	ArrayDelta,
	CRDTArray,
	CRDTDoc,
	CRDTMap,
	CRDTProvider,
	DeepChange,
	DeepChangeEvent,
	Unsubscribe,
} from '../types';
import { ChangeAction, CRDTEngine } from '../types';

type AutomergeDoc = Automerge.Doc<Record<string, unknown>>;
type ChangeHandler = (changes: DeepChange[]) => void;

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

	get(key: string): T | CRDTMap<unknown> | CRDTArray<unknown> | undefined {
		const mapData = this.getMapData();
		const value = mapData[key];

		// If value is an object (not null, not array), return a nested AutomergeMap
		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			return new AutomergeNestedMap(this.docHolder, this.mapName, [key]) as CRDTMap<unknown>;
		}
		// If value is an array, return a nested AutomergeArray
		if (Array.isArray(value)) {
			return new AutomergeNestedArray(this.docHolder, this.mapName, [key]) as CRDTArray<unknown>;
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

	get(key: string): T | CRDTMap<unknown> | CRDTArray<unknown> | undefined {
		const data = this.getNestedData();
		if (!data) return undefined;

		const value = data[key];

		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			return new AutomergeNestedMap(this.docHolder, this.mapName, [
				...this.path,
				key,
			]) as CRDTMap<unknown>;
		}
		if (Array.isArray(value)) {
			return new AutomergeNestedArray(this.docHolder, this.mapName, [
				...this.path,
				key,
			]) as CRDTArray<unknown>;
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
 * Automerge implementation of CRDTArray.
 */
class AutomergeArray<T = unknown> implements CRDTArray<T> {
	constructor(
		private readonly docHolder: AutomergeDocHolder,
		private readonly arrayName: string,
	) {}

	private getArrayData(): unknown[] {
		const doc = this.docHolder.getDoc();
		return (doc[this.arrayName] as unknown[]) ?? [];
	}

	get length(): number {
		return this.getArrayData().length;
	}

	get(index: number): T | CRDTMap<unknown> | CRDTArray<unknown> | undefined {
		const arrayData = this.getArrayData();
		if (index < 0 || index >= arrayData.length) return undefined;

		const value = arrayData[index];

		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			return new AutomergeNestedMap(this.docHolder, this.arrayName, [index]) as CRDTMap<unknown>;
		}
		if (Array.isArray(value)) {
			return new AutomergeNestedArray(this.docHolder, this.arrayName, [
				index,
			]) as CRDTArray<unknown>;
		}

		return value as T | undefined;
	}

	push(...items: T[]): void {
		this.docHolder.change((doc) => {
			doc[this.arrayName] ??= [];
			const arr = doc[this.arrayName] as unknown[];
			arr.push(...items);
		});
	}

	insert(index: number, ...items: T[]): void {
		this.docHolder.change((doc) => {
			doc[this.arrayName] ??= [];
			const arr = doc[this.arrayName] as unknown[];
			arr.splice(index, 0, ...items);
		});
	}

	delete(index: number, count = 1): void {
		this.docHolder.change((doc) => {
			if (doc[this.arrayName]) {
				const arr = doc[this.arrayName] as unknown[];
				arr.splice(index, count);
			}
		});
	}

	toArray(): T[] {
		return [...this.getArrayData()] as T[];
	}

	toJSON(): T[] {
		return this.toArray();
	}

	onDeepChange(handler: ChangeHandler): Unsubscribe {
		this.docHolder.addChangeHandler(this.arrayName, handler);
		return () => {
			this.docHolder.removeChangeHandler(this.arrayName, handler);
		};
	}
}

/**
 * Nested array for accessing deep paths within an Automerge document.
 */
class AutomergeNestedArray<T = unknown> implements CRDTArray<T> {
	constructor(
		private readonly docHolder: AutomergeDocHolder,
		private readonly arrayName: string,
		private readonly path: Array<string | number>,
	) {}

	private getNestedData(): unknown[] | undefined {
		const doc = this.docHolder.getDoc();
		let current: unknown = doc[this.arrayName];

		for (const segment of this.path) {
			if (current === null || current === undefined) {
				return undefined;
			}
			current = (current as Record<string | number, unknown>)[segment];
		}

		return Array.isArray(current) ? current : undefined;
	}

	get length(): number {
		return this.getNestedData()?.length ?? 0;
	}

	get(index: number): T | CRDTMap<unknown> | CRDTArray<unknown> | undefined {
		const data = this.getNestedData();
		if (!data || index < 0 || index >= data.length) return undefined;

		const value = data[index];

		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			return new AutomergeNestedMap(this.docHolder, this.arrayName, [
				...this.path,
				index,
			]) as CRDTMap<unknown>;
		}
		if (Array.isArray(value)) {
			return new AutomergeNestedArray(this.docHolder, this.arrayName, [
				...this.path,
				index,
			]) as CRDTArray<unknown>;
		}

		return value as T | undefined;
	}

	push(...items: T[]): void {
		this.docHolder.change((doc) => {
			let current: unknown = doc[this.arrayName];
			for (const segment of this.path) {
				if (!current) return;
				current = (current as Record<string | number, unknown>)[segment];
			}
			if (Array.isArray(current)) {
				current.push(...items);
			}
		});
	}

	insert(index: number, ...items: T[]): void {
		this.docHolder.change((doc) => {
			let current: unknown = doc[this.arrayName];
			for (const segment of this.path) {
				if (!current) return;
				current = (current as Record<string | number, unknown>)[segment];
			}
			if (Array.isArray(current)) {
				current.splice(index, 0, ...items);
			}
		});
	}

	delete(index: number, count = 1): void {
		this.docHolder.change((doc) => {
			let current: unknown = doc[this.arrayName];
			for (const segment of this.path) {
				if (!current) return;
				current = (current as Record<string | number, unknown>)[segment];
			}
			if (Array.isArray(current)) {
				current.splice(index, count);
			}
		});
	}

	toArray(): T[] {
		return [...(this.getNestedData() ?? [])] as T[];
	}

	toJSON(): T[] {
		return this.toArray();
	}

	onDeepChange(handler: ChangeHandler): Unsubscribe {
		this.docHolder.addChangeHandler(this.arrayName, handler);
		return () => {
			this.docHolder.removeChangeHandler(this.arrayName, handler);
		};
	}
}

type UpdateHandler = (update: Uint8Array) => void;

/**
 * Holds the Automerge document and manages change handlers.
 */
class AutomergeDocHolder {
	private doc: AutomergeDoc;
	private changeHandlers: Map<string, Set<ChangeHandler>> = new Map();
	private updateHandlers: Set<UpdateHandler> = new Set();
	/** Tracks nested transaction depth (0 = not in transaction) */
	private transactionDepth = 0;
	private transactionBeforeHeads: Automerge.Heads | null = null;
	/** Queued change functions to apply when outermost transaction ends */
	private pendingChanges: Array<(doc: Record<string, unknown>) => void> = [];
	/** Tracks the last heads sent to update handlers for incremental sync */
	private lastSyncedHeads: Automerge.Heads = [];

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
		if (this.transactionDepth > 0) {
			// Inside a transaction - queue the change for later
			this.pendingChanges.push(fn);
			return;
		}

		// Not in transaction - apply immediately
		const beforeHeads = this.getHeads();
		this.doc = Automerge.change(this.doc, fn);
		this.notifyHandlers(beforeHeads);
		this.notifyUpdateHandlers();
	}

	startTransaction(): void {
		if (this.transactionDepth === 0) {
			// Outermost transaction - capture heads before any changes
			this.transactionBeforeHeads = this.getHeads();
		}
		this.transactionDepth++;
	}

	endTransaction(): void {
		this.transactionDepth--;

		if (this.transactionDepth === 0) {
			// Outermost transaction ending - apply all queued changes
			if (this.pendingChanges.length > 0) {
				const changes = this.pendingChanges;
				this.pendingChanges = [];

				this.doc = Automerge.change(this.doc, (doc) => {
					for (const fn of changes) {
						fn(doc);
					}
				});
			}

			// Notify with all changes at once
			if (this.transactionBeforeHeads) {
				this.notifyHandlers(this.transactionBeforeHeads);
				this.notifyUpdateHandlers();
				this.transactionBeforeHeads = null;
			}
		}
	}

	private notifyUpdateHandlers(): void {
		if (this.updateHandlers.size === 0) return;

		// Use saveSince for incremental updates instead of full save
		// This dramatically reduces bandwidth for large documents
		const update = Automerge.saveSince(this.doc, this.lastSyncedHeads);
		this.lastSyncedHeads = this.getHeads();

		// Skip if no actual changes (empty update)
		if (update.byteLength === 0) return;

		for (const handler of this.updateHandlers) {
			handler(update);
		}
	}

	addUpdateHandler(handler: UpdateHandler): void {
		this.updateHandlers.add(handler);
	}

	removeUpdateHandler(handler: UpdateHandler): void {
		this.updateHandlers.delete(handler);
	}

	private notifyHandlers(beforeHeads: Automerge.Heads): void {
		const afterHeads = this.getHeads();
		const patches = Automerge.diff(this.doc, beforeHeads, afterHeads);

		// Group patches by container name, filtering out container creation patches
		const patchesByContainer = new Map<string, typeof patches>();
		for (const patch of patches) {
			// Skip patches with only 1 path segment (container creation)
			// These are internal to how we structure the document
			if (patch.path.length <= 1) continue;

			const containerName = patch.path[0] as string;
			if (!patchesByContainer.has(containerName)) {
				patchesByContainer.set(containerName, []);
			}
			patchesByContainer.get(containerName)!.push(patch);
		}

		// Notify handlers for each container
		for (const [containerName, containerPatches] of patchesByContainer) {
			const handlers = this.changeHandlers.get(containerName);
			if (!handlers || handlers.size === 0) continue;

			const changes = this.patchesToChanges(containerPatches, containerName, beforeHeads);

			if (changes.length > 0) {
				for (const handler of handlers) {
					handler(changes);
				}
			}
		}
	}

	/**
	 * Convert Automerge patches to DeepChange events.
	 * Separates array patches (insert/del with numeric index) from map patches.
	 */
	private patchesToChanges(
		patches: Automerge.Patch[],
		containerName: string,
		beforeHeads: Automerge.Heads,
	): DeepChange[] {
		const arrayPatches: Automerge.Patch[] = [];
		const mapPatches: Automerge.Patch[] = [];

		for (const patch of patches) {
			// Array operations: insert always, del only if last path segment is numeric
			if (patch.action === 'insert') {
				arrayPatches.push(patch);
			} else if (patch.action === 'del' && typeof patch.path[patch.path.length - 1] === 'number') {
				arrayPatches.push(patch);
			} else {
				mapPatches.push(patch);
			}
		}

		return [
			...this.arrayPatchesToDeltas(arrayPatches),
			...this.mapPatchesToChanges(mapPatches, containerName, beforeHeads),
		];
	}

	/**
	 * Convert array patches to ArrayChangeEvent with Quill-style delta format.
	 * Automerge: { action: 'insert', path: [..., index], values: [...] }
	 * Delta:     [{ retain: N }, { insert: [...] }]
	 */
	private arrayPatchesToDeltas(patches: Automerge.Patch[]): ArrayChangeEvent[] {
		if (patches.length === 0) return [];

		// Group by array path (everything except the index)
		const byPath = new Map<string, Automerge.Patch[]>();
		for (const patch of patches) {
			const arrayPath = patch.path.slice(1, -1); // Remove container name and index
			const key = arrayPath.join('/');
			if (!byPath.has(key)) byPath.set(key, []);
			byPath.get(key)!.push(patch);
		}

		const changes: ArrayChangeEvent[] = [];
		for (const [pathKey, groupPatches] of byPath) {
			const arrayPath = pathKey
				? pathKey.split('/').map((s) => (isNaN(Number(s)) ? s : Number(s)))
				: [];

			// Sort by index for proper delta generation
			groupPatches.sort((a, b) => (a.path.at(-1) as number) - (b.path.at(-1) as number));

			const delta: ArrayDelta[] = [];
			let pos = 0;

			for (const patch of groupPatches) {
				const index = patch.path.at(-1) as number;
				if (index > pos) delta.push({ retain: index - pos });

				if (patch.action === 'insert' && 'values' in patch) {
					delta.push({ insert: patch.values as unknown[] });
					pos = index + (patch.values as unknown[]).length;
				} else if (patch.action === 'del') {
					const count = 'length' in patch ? (patch.length as number) : 1;
					delta.push({ delete: count });
					pos = index;
				}
			}

			if (delta.length > 0) changes.push({ path: arrayPath, delta });
		}

		return changes;
	}

	/**
	 * Convert map patches to DeepChangeEvent format.
	 */
	private mapPatchesToChanges(
		patches: Automerge.Patch[],
		containerName: string,
		beforeHeads: Automerge.Heads,
	): DeepChangeEvent[] {
		// Collapse patches that are children of other patches with empty object values
		const collapsedPatches = this.collapseObjectPatches(patches, containerName);

		return collapsedPatches.map((patch) => {
			const path = patch.path.slice(1);
			const action =
				patch.action === 'del'
					? ChangeAction.delete
					: this.wasKeyExisting(containerName, path, beforeHeads)
						? ChangeAction.update
						: ChangeAction.add;

			return {
				path,
				action,
				...(patch.action !== 'del' && 'value' in patch && { value: patch.value }),
				...(action !== ChangeAction.add && {
					oldValue: this.getOldValue(containerName, path, beforeHeads),
				}),
			};
		});
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

	applyUpdate(update: Uint8Array): void {
		const beforeHeads = this.getHeads();

		// Use loadIncremental which handles both full saves and incremental updates
		// This is more efficient than load+merge and works with saveSince output
		this.doc = Automerge.loadIncremental(this.doc, update);

		const afterHeads = this.getHeads();

		// Only notify if something actually changed
		const headsChanged =
			beforeHeads.length !== afterHeads.length ||
			beforeHeads.some((head, index) => head !== afterHeads[index]);

		if (headsChanged) {
			this.notifyHandlers(beforeHeads);
			// Notify update handlers so changes propagate through sync chains (hub topology).
			// Automerge's saveSince() handles deduplication - it only returns changes
			// newer than lastSyncedHeads, so re-broadcasting the same data is prevented
			// at the serialization level, not here.
			this.notifyUpdateHandlers();
		}
	}

	destroy(): void {
		this.changeHandlers.clear();
		this.updateHandlers.clear();
		this.pendingChanges = [];
		this.transactionDepth = 0;
		this.transactionBeforeHeads = null;
	}
}

/**
 * Automerge implementation of CRDTDoc.
 */
class AutomergeDocImpl implements CRDTDoc {
	private readonly docHolder: AutomergeDocHolder;

	constructor(readonly id: string) {
		this.docHolder = new AutomergeDocHolder(id);
	}

	getMap<T = unknown>(name: string): CRDTMap<T> {
		return new AutomergeMap<T>(this.docHolder, name);
	}

	getArray<T = unknown>(name: string): CRDTArray<T> {
		return new AutomergeArray<T>(this.docHolder, name);
	}

	transact(fn: () => void): void {
		this.docHolder.startTransaction();
		try {
			fn();
		} finally {
			this.docHolder.endTransaction();
		}
	}

	encodeState(): Uint8Array {
		return Automerge.save(this.docHolder.getDoc());
	}

	applyUpdate(update: Uint8Array): void {
		this.docHolder.applyUpdate(update);
	}

	onUpdate(handler: (update: Uint8Array) => void): Unsubscribe {
		this.docHolder.addUpdateHandler(handler);
		return () => {
			this.docHolder.removeUpdateHandler(handler);
		};
	}

	destroy(): void {
		this.docHolder.destroy();
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
