import * as Automerge from '@automerge/automerge';
import { unpatchAll } from '@onsetsoftware/automerge-patcher';

import type {
	CRDTUndoManager,
	UndoManagerOptions,
	UndoStackChangeEvent,
	Unsubscribe,
} from '../types';

type AutomergeDoc = Automerge.Doc<Record<string, unknown>>;

/**
 * Represents a single undoable operation.
 * Stores patches and the document state before the change for computing inverses.
 */
interface UndoItem {
	/** Patches that were applied in this change */
	patches: Automerge.Patch[];
	/** Document state before the patches were applied (for computing inverses) */
	beforeDoc: AutomergeDoc;
	/** User metadata (for cursor restoration, etc.) */
	meta: Map<string, unknown>;
	/** Timestamp when this item was created */
	timestamp: number;
}

/**
 * Automerge implementation of CRDTUndoManager.
 * Uses patch inversion via @onsetsoftware/automerge-patcher.
 *
 * Strategy:
 * - On local change: capture patches and beforeDoc as an undo item
 * - On undo: compute inverse patches using unpatchAll and apply them
 * - On redo: reapply the original patches
 * - Remote changes are ignored (don't affect undo stack)
 *
 * ## Performance Considerations
 *
 * This implementation has O(n) memory overhead per undo item because each item
 * stores a full document clone (`beforeDoc`). This is required for correct patch
 * inversion - `unpatchAll()` needs the document state before the patches were
 * applied to compute inverse patches correctly.
 *
 * For a document with N bytes and U undo items, memory usage is approximately O(N * U).
 *
 * Future optimization possibilities:
 * - Store only Automerge heads and use `Automerge.view(doc, heads)` for lazy
 *   reconstruction when undo is actually performed
 * - Implement incremental patch tracking that doesn't require full doc clones
 * - Add configurable stack size limits to bound memory usage
 */
export class AutomergeUndoManager implements CRDTUndoManager {
	private undoStack: UndoItem[] = [];
	private redoStack: UndoItem[] = [];
	private readonly stackChangeHandlers = new Set<(event: UndoStackChangeEvent) => void>();
	private destroyed = false;

	/** Metadata from the last undo/redo operation */
	private lastMeta: Map<string, unknown> | null = null;

	/** Capture timeout for grouping changes */
	private readonly captureTimeout: number;

	/** Timestamp of last captured change */
	private lastCaptureTime = 0;

	/** Whether to force a new capture on next change */
	private forcedCapture = false;

	/** Previous stack state for change detection */
	private prevCanUndo = false;
	private prevCanRedo = false;

	/**
	 * Reference to doc getter function.
	 * We use a getter instead of direct reference since Automerge docs are immutable.
	 */
	private readonly getDoc: () => AutomergeDoc;

	/**
	 * Function to apply patches to the document within an Automerge.change() context.
	 */
	private readonly applyPatches: (patches: Automerge.Patch[]) => void;

	/** Flag to track whether we're in an undo/redo operation */
	private isUndoRedoOperation = false;

	constructor(
		getDoc: () => AutomergeDoc,
		applyPatches: (patches: Automerge.Patch[]) => void,
		options: UndoManagerOptions = {},
	) {
		this.getDoc = getDoc;
		this.applyPatches = applyPatches;
		this.captureTimeout = options.captureTimeout ?? 500;
	}

	/**
	 * Check if currently performing an undo/redo operation.
	 * Used by AutomergeDocHolder to avoid capturing undo/redo as new changes.
	 */
	isPerformingUndoRedo(): boolean {
		return this.isUndoRedoOperation;
	}

	/**
	 * Called by the document holder when a local change occurs.
	 * Captures the patches for undo tracking.
	 */
	captureChange(beforeDoc: AutomergeDoc, patches: Automerge.Patch[]): void {
		if (this.destroyed || this.isUndoRedoOperation || patches.length === 0) return;

		const now = Date.now();
		const shouldMerge =
			!this.forcedCapture &&
			this.undoStack.length > 0 &&
			now - this.lastCaptureTime < this.captureTimeout;

		if (shouldMerge) {
			// Merge with the last undo item - append new patches
			const lastItem = this.undoStack[this.undoStack.length - 1];
			lastItem.patches = [...lastItem.patches, ...patches];
			lastItem.timestamp = now;
		} else {
			// Create a new undo item
			this.undoStack.push({
				patches,
				beforeDoc: Automerge.clone(beforeDoc),
				meta: new Map(),
				timestamp: now,
			});
		}

		// Clear redo stack on new changes
		this.redoStack = [];

		this.lastCaptureTime = now;
		this.forcedCapture = false;

		this.notifyIfChanged();
	}

	/**
	 * Called by the document holder when a remote change is applied.
	 * Updates tracking but does NOT affect undo/redo stacks.
	 */
	onRemoteChange(): void {
		if (this.destroyed) return;
		// Remote changes don't affect undo/redo stacks
	}

	undo(): boolean {
		if (this.destroyed || !this.canUndo()) return false;

		const item = this.undoStack.pop()!;
		this.lastMeta = item.meta;

		this.isUndoRedoOperation = true;
		try {
			// Compute inverse patches using the beforeDoc state
			// Type assertion needed because unpatchAll returns its own Patch type
			const inversePatches = unpatchAll(item.beforeDoc, item.patches) as Automerge.Patch[];

			// Store the current doc for redo
			const currentDoc = Automerge.clone(this.getDoc());

			// Apply inverse patches
			this.applyPatches(inversePatches);

			// Push to redo stack with original patches
			this.redoStack.push({
				patches: item.patches,
				beforeDoc: currentDoc,
				meta: item.meta,
				timestamp: Date.now(),
			});
		} finally {
			this.isUndoRedoOperation = false;
		}

		this.notifyIfChanged();
		return true;
	}

	redo(): boolean {
		if (this.destroyed || !this.canRedo()) return false;

		const item = this.redoStack.pop()!;
		this.lastMeta = item.meta;

		this.isUndoRedoOperation = true;
		try {
			// Store the current doc for undo
			const currentDoc = Automerge.clone(this.getDoc());

			// Apply original patches
			this.applyPatches(item.patches);

			// Push back to undo stack
			this.undoStack.push({
				patches: item.patches,
				beforeDoc: currentDoc,
				meta: item.meta,
				timestamp: Date.now(),
			});
		} finally {
			this.isUndoRedoOperation = false;
		}

		this.notifyIfChanged();
		return true;
	}

	canUndo(): boolean {
		if (this.destroyed) return false;
		return this.undoStack.length > 0;
	}

	canRedo(): boolean {
		if (this.destroyed) return false;
		return this.redoStack.length > 0;
	}

	stopCapturing(): void {
		this.forcedCapture = true;
	}

	clear(): void {
		this.undoStack = [];
		this.redoStack = [];
		this.lastMeta = null;
		this.forcedCapture = false;
		this.notifyIfChanged();
	}

	onStackChange(handler: (event: UndoStackChangeEvent) => void): Unsubscribe {
		this.stackChangeHandlers.add(handler);
		return () => {
			this.stackChangeHandlers.delete(handler);
		};
	}

	setMeta<V>(key: string, value: V): void {
		const currentItem = this.undoStack[this.undoStack.length - 1];
		if (currentItem) {
			currentItem.meta.set(key, value);
		}
	}

	getMeta<V>(key: string): V | undefined {
		return this.lastMeta?.get(key) as V | undefined;
	}

	destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;

		this.undoStack = [];
		this.redoStack = [];
		this.stackChangeHandlers.clear();
		this.lastMeta = null;
	}

	private notifyIfChanged(): void {
		if (this.destroyed) return;

		const canUndo = this.canUndo();
		const canRedo = this.canRedo();

		// Only notify if state actually changed
		if (canUndo !== this.prevCanUndo || canRedo !== this.prevCanRedo) {
			this.prevCanUndo = canUndo;
			this.prevCanRedo = canRedo;

			const event: UndoStackChangeEvent = { canUndo, canRedo };
			for (const handler of this.stackChangeHandlers) {
				handler(event);
			}
		}
	}
}
