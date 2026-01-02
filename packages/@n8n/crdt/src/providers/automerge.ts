import * as Automerge from '@automerge/automerge';
import { patch as applyPatch } from '@onsetsoftware/automerge-patcher';

import { AutomergeAwareness } from '../awareness/automerge-awareness';
import type {
	ArrayChangeEvent,
	ArrayDelta,
	AwarenessState,
	ChangeOrigin,
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
import { ChangeAction, ChangeOrigin as ChangeOriginConst, CRDTEngine } from '../types';
import { AutomergeUndoManager } from '../undo/automerge-undo-manager';

type AutomergeDoc = Automerge.Doc<Record<string, unknown>>;
type ChangeHandler = (changes: DeepChange[], origin: ChangeOrigin) => void;

/**
 * Extract plain data from a value, unwrapping detached CRDT types.
 */
function extractPlainValue(value: unknown): unknown {
	if (value instanceof DetachedAutomergeMap) {
		return value.toJSON();
	}
	if (value instanceof DetachedAutomergeArray) {
		return value.toJSON();
	}
	return value;
}

/**
 * Detached (standalone) map that stores data in memory until attached to a document.
 * This allows createMap() to work in Automerge by storing data locally.
 */
class DetachedAutomergeMap<T = unknown> implements CRDTMap<T> {
	private data: Record<string, unknown> = {};

	get(key: string): T | CRDTMap<unknown> | CRDTArray<unknown> | undefined {
		return this.data[key] as T | undefined;
	}

	set(key: string, value: T | CRDTMap<unknown> | CRDTArray<unknown>): void {
		this.data[key] = extractPlainValue(value);
	}

	delete(key: string): void {
		delete this.data[key];
	}

	has(key: string): boolean {
		return key in this.data;
	}

	keys(): IterableIterator<string> {
		return Object.keys(this.data)[Symbol.iterator]();
	}

	*values(): IterableIterator<T | CRDTMap<unknown> | CRDTArray<unknown>> {
		for (const value of Object.values(this.data)) {
			yield value as T;
		}
	}

	*entries(): IterableIterator<[string, T | CRDTMap<unknown> | CRDTArray<unknown>]> {
		for (const [key, value] of Object.entries(this.data)) {
			yield [key, value as T];
		}
	}

	toJSON(): Record<string, T> {
		return { ...this.data } as Record<string, T>;
	}

	onDeepChange(_handler: (changes: DeepChange[], origin: ChangeOrigin) => void): Unsubscribe {
		// Detached maps don't emit change events - they're not connected to a document
		return () => {};
	}
}

/**
 * Detached (standalone) array that stores data in memory until attached to a document.
 * This allows createArray() to work in Automerge by storing data locally.
 */
class DetachedAutomergeArray<T = unknown> implements CRDTArray<T> {
	private data: unknown[] = [];

	get length(): number {
		return this.data.length;
	}

	get(index: number): T | undefined {
		if (index < 0 || index >= this.data.length) return undefined;
		return this.data[index] as T | undefined;
	}

	push(...items: T[]): void {
		this.data.push(...items.map(extractPlainValue));
	}

	insert(index: number, ...items: T[]): void {
		this.data.splice(index, 0, ...items.map(extractPlainValue));
	}

	delete(index: number, count = 1): void {
		this.data.splice(index, count);
	}

	toArray(): T[] {
		return [...this.data] as T[];
	}

	toJSON(): T[] {
		return this.toArray();
	}

	onDeepChange(_handler: (changes: DeepChange[], origin: ChangeOrigin) => void): Unsubscribe {
		// Detached arrays don't emit change events - they're not connected to a document
		return () => {};
	}
}

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
		// Automerge stores plain objects, not CRDT types
		return mapData[key] as T | undefined;
	}

	set(key: string, value: T | CRDTMap<unknown> | CRDTArray<unknown>): void {
		this.docHolder.change((doc) => {
			doc[this.mapName] ??= {};
			(doc[this.mapName] as Record<string, unknown>)[key] = extractPlainValue(value);
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

	*values(): IterableIterator<T | CRDTMap<unknown> | CRDTArray<unknown>> {
		const mapData = this.getMapData();
		for (const value of Object.values(mapData)) {
			// Automerge stores plain objects, not CRDT types
			yield value as T;
		}
	}

	*entries(): IterableIterator<[string, T | CRDTMap<unknown> | CRDTArray<unknown>]> {
		const mapData = this.getMapData();
		for (const [key, value] of Object.entries(mapData)) {
			// Automerge stores plain objects, not CRDT types
			yield [key, value as T];
		}
	}

	toJSON(): Record<string, T> {
		return { ...this.getMapData() } as Record<string, T>;
	}

	onDeepChange(handler: (changes: DeepChange[], origin: ChangeOrigin) => void): Unsubscribe {
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

	get(index: number): T | undefined {
		const arrayData = this.getArrayData();
		if (index < 0 || index >= arrayData.length) return undefined;
		return arrayData[index] as T | undefined;
	}

	push(...items: T[]): void {
		this.docHolder.change((doc) => {
			doc[this.arrayName] ??= [];
			const arr = doc[this.arrayName] as unknown[];
			arr.push(...items.map(extractPlainValue));
		});
	}

	insert(index: number, ...items: T[]): void {
		this.docHolder.change((doc) => {
			doc[this.arrayName] ??= [];
			const arr = doc[this.arrayName] as unknown[];
			arr.splice(index, 0, ...items.map(extractPlainValue));
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

	onDeepChange(handler: (changes: DeepChange[], origin: ChangeOrigin) => void): Unsubscribe {
		this.docHolder.addChangeHandler(this.arrayName, handler);
		return () => {
			this.docHolder.removeChangeHandler(this.arrayName, handler);
		};
	}
}

type UpdateHandler = (update: Uint8Array, origin: ChangeOrigin) => void;

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
	private transactionBeforeDoc: AutomergeDoc | null = null;
	/** Queued change functions to apply when outermost transaction ends */
	private pendingChanges: Array<(doc: Record<string, unknown>) => void> = [];
	/** Tracks the last heads sent to update handlers for incremental sync */
	private lastSyncedHeads: Automerge.Heads = [];
	/** Optional undo manager for tracking changes */
	private undoManager: AutomergeUndoManager | null = null;

	constructor(readonly id: string) {
		this.doc = Automerge.init();
	}

	getDoc(): AutomergeDoc {
		return this.doc;
	}

	getHeads(): Automerge.Heads {
		return Automerge.getHeads(this.doc);
	}

	setUndoManager(manager: AutomergeUndoManager): void {
		this.undoManager = manager;
	}

	/**
	 * Apply a change to the document.
	 *
	 * Performance note: When an undo manager is active, this method clones the
	 * entire document before applying changes (O(n) where n = document size).
	 * This is required for correct patch inversion in the undo manager.
	 * See AutomergeUndoManager for details on the performance trade-offs.
	 */
	change(fn: (doc: Record<string, unknown>) => void): void {
		if (this.transactionDepth > 0) {
			// Inside a transaction - queue the change for later
			this.pendingChanges.push(fn);
			return;
		}

		// Not in transaction - apply immediately
		const beforeHeads = this.getHeads();
		// Clone doc for undo manager - O(n) but required for correct patch inversion
		const beforeDoc = this.undoManager ? Automerge.clone(this.doc) : null;
		let capturedPatches: Automerge.Patch[] = [];

		this.doc = Automerge.change(
			this.doc,
			{
				patchCallback: (patches) => {
					capturedPatches = patches;
				},
			},
			fn,
		);

		// Notify undo manager of local change (if not performing undo/redo)
		if (this.undoManager && !this.undoManager.isPerformingUndoRedo() && beforeDoc) {
			this.undoManager.captureChange(beforeDoc, capturedPatches);
		}

		this.notifyHandlers(beforeHeads, ChangeOriginConst.local);
		this.notifyUpdateHandlers(ChangeOriginConst.local);
	}

	startTransaction(): void {
		if (this.transactionDepth === 0) {
			// Outermost transaction - capture heads and doc before any changes
			this.transactionBeforeHeads = this.getHeads();
			// Clone doc for undo manager - O(n) but required for correct patch inversion
			this.transactionBeforeDoc = this.undoManager ? Automerge.clone(this.doc) : null;
		}
		this.transactionDepth++;
	}

	endTransaction(): void {
		this.transactionDepth--;

		if (this.transactionDepth === 0) {
			// Outermost transaction ending - apply all queued changes
			let capturedPatches: Automerge.Patch[] = [];

			if (this.pendingChanges.length > 0) {
				const changes = this.pendingChanges;
				this.pendingChanges = [];

				this.doc = Automerge.change(
					this.doc,
					{
						patchCallback: (patches) => {
							capturedPatches = patches;
						},
					},
					(doc) => {
						for (const fn of changes) {
							fn(doc);
						}
					},
				);
			}

			// Notify with all changes at once
			if (this.transactionBeforeHeads) {
				// Notify undo manager of local change (if not performing undo/redo)
				if (
					this.undoManager &&
					!this.undoManager.isPerformingUndoRedo() &&
					this.transactionBeforeDoc
				) {
					this.undoManager.captureChange(this.transactionBeforeDoc, capturedPatches);
				}

				this.notifyHandlers(this.transactionBeforeHeads, ChangeOriginConst.local);
				this.notifyUpdateHandlers(ChangeOriginConst.local);
				this.transactionBeforeHeads = null;
				this.transactionBeforeDoc = null;
			}
		}
	}

	private notifyUpdateHandlers(origin: ChangeOrigin): void {
		if (this.updateHandlers.size === 0) return;

		// Use saveSince for incremental updates instead of full save
		// This dramatically reduces bandwidth for large documents
		const update = Automerge.saveSince(this.doc, this.lastSyncedHeads);
		this.lastSyncedHeads = this.getHeads();

		// Skip if no actual changes (empty update)
		if (update.byteLength === 0) return;

		for (const handler of this.updateHandlers) {
			handler(update, origin);
		}
	}

	addUpdateHandler(handler: UpdateHandler): void {
		this.updateHandlers.add(handler);
	}

	removeUpdateHandler(handler: UpdateHandler): void {
		this.updateHandlers.delete(handler);
	}

	private notifyHandlers(beforeHeads: Automerge.Heads, origin: ChangeOrigin): void {
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
					handler(changes, origin);
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
			// Notify undo manager of remote change (does not affect stacks)
			if (this.undoManager) {
				this.undoManager.onRemoteChange();
			}

			this.notifyHandlers(beforeHeads, ChangeOriginConst.remote);
			// Notify update handlers so changes propagate through sync chains (hub topology).
			// Automerge's saveSince() handles deduplication - it only returns changes
			// newer than lastSyncedHeads, so re-broadcasting the same data is prevented
			// at the serialization level, not here.
			this.notifyUpdateHandlers(ChangeOriginConst.remote);
		}
	}

	/**
	 * Apply patches for undo/redo operations.
	 * Used by the undo manager to apply inverse patches without triggering capture.
	 */
	applyPatches(patches: Automerge.Patch[]): void {
		if (patches.length === 0) return;

		const beforeHeads = this.getHeads();
		this.doc = Automerge.change(this.doc, (doc) => {
			for (const p of patches) {
				applyPatch(doc, p);
			}
		});
		this.notifyHandlers(beforeHeads, ChangeOriginConst.local);
		this.notifyUpdateHandlers(ChangeOriginConst.local);
	}

	destroy(): void {
		if (this.undoManager) {
			this.undoManager.destroy();
			this.undoManager = null;
		}
		this.changeHandlers.clear();
		this.updateHandlers.clear();
		this.pendingChanges = [];
		this.transactionDepth = 0;
		this.transactionBeforeHeads = null;
		this.transactionBeforeDoc = null;
	}
}

/**
 * Automerge implementation of CRDTDoc.
 */
class AutomergeDocImpl implements CRDTDoc {
	private readonly docHolder: AutomergeDocHolder;
	private awareness: AutomergeAwareness | null = null;
	private _synced = false;
	private syncHandlers = new Set<(isSynced: boolean) => void>();

	constructor(readonly id: string) {
		this.docHolder = new AutomergeDocHolder(id);
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
		return new AutomergeMap<T>(this.docHolder, name);
	}

	getArray<T = unknown>(name: string): CRDTArray<T> {
		return new AutomergeArray<T>(this.docHolder, name);
	}

	createMap<T = unknown>(): CRDTMap<T> {
		// Return a detached map that stores data locally until attached to a document
		return new DetachedAutomergeMap<T>();
	}

	createArray<T = unknown>(): CRDTArray<T> {
		// Return a detached array that stores data locally until attached to a document
		return new DetachedAutomergeArray<T>();
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

	onUpdate(handler: (update: Uint8Array, origin: ChangeOrigin) => void): Unsubscribe {
		this.docHolder.addUpdateHandler(handler);
		return () => {
			this.docHolder.removeUpdateHandler(handler);
		};
	}

	getAwareness<T extends AwarenessState = AwarenessState>(): CRDTAwareness<T> {
		this.awareness ??= new AutomergeAwareness(this.id);
		return this.awareness as unknown as CRDTAwareness<T>;
	}

	createUndoManager(options?: UndoManagerOptions): CRDTUndoManager {
		const undoManager = new AutomergeUndoManager(
			() => this.docHolder.getDoc(),
			(patches) => this.docHolder.applyPatches(patches),
			options,
		);
		this.docHolder.setUndoManager(undoManager);
		return undoManager;
	}

	destroy(): void {
		if (this.awareness) {
			this.awareness.destroy();
			this.awareness = null;
		}
		this.syncHandlers.clear();
		this._synced = false;
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
