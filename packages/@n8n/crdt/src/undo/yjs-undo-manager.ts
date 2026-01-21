import * as Y from 'yjs';

import type {
	CRDTUndoManager,
	UndoManagerOptions,
	UndoStackChangeEvent,
	Unsubscribe,
} from '../types';

/** Origin symbol used for undo manager to track local changes */
export const YjsUndoManagerOrigin = Symbol('local-undo-tracked');

/** Origin symbol used for remote changes that should NOT be tracked */
export const YjsRemoteOrigin = Symbol('remote-no-track');

/**
 * Stack item type from Y.UndoManager events.
 */
interface YjsStackItem {
	meta: Map<string, unknown>;
}

/**
 * Event type from Y.UndoManager stack events.
 */
interface YjsStackEvent {
	stackItem: YjsStackItem;
	type: 'undo' | 'redo';
}

/**
 * Yjs implementation of CRDTUndoManager.
 * Wraps Y.UndoManager with document-wide scope.
 */
export class YjsUndoManager implements CRDTUndoManager {
	private readonly undoManager: Y.UndoManager;
	private readonly stackChangeHandlers = new Set<(event: UndoStackChangeEvent) => void>();
	private destroyed = false;

	/** Metadata from the last undo/redo operation */
	private lastMeta: Map<string, unknown> | null = null;

	/** Previous stack state for change detection */
	private prevCanUndo = false;
	private prevCanRedo = false;

	constructor(yDoc: Y.Doc, options: UndoManagerOptions = {}) {
		const { captureTimeout = 500 } = options;

		// Create UndoManager scoped to all root-level types in the document
		// This provides document-wide undo rather than per-structure
		// Y.UndoManager accepts AbstractType or array of AbstractType
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const scope: Array<Y.AbstractType<Y.YEvent<any>>> = [];

		// Get all named maps and arrays at the root
		const typeNames: string[] = [];
		yDoc.share.forEach((type, name) => {
			scope.push(type);
			typeNames.push(name);
		});

		// If no types exist yet, we still need a valid scope
		// Create a dummy type that will be included when real types are added
		if (scope.length === 0) {
			// Use a hidden map as the scope - any changes will still be tracked
			// because Y.UndoManager observes the doc's transaction events.
			// Double cast required: Y.Map extends AbstractType at runtime, but TypeScript's
			// event type hierarchy (YMapEvent vs YEvent) prevents direct assignment
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const dummyScope = yDoc.getMap('__undo_scope__') as unknown as Y.AbstractType<Y.YEvent<any>>;
			scope.push(dummyScope);
		}

		this.undoManager = new Y.UndoManager(scope, {
			captureTimeout,
			// Track changes from our local origin and null (direct mutations)
			// Remote changes use YjsRemoteOrigin which is NOT in this set
			trackedOrigins: new Set([YjsUndoManagerOrigin, null]),
		});

		// Listen for stack changes to notify handlers
		this.undoManager.on('stack-item-added', this.handleStackChange);
		this.undoManager.on('stack-item-popped', this.handleStackItemPopped);
	}

	private handleStackChange = (): void => {
		if (this.destroyed) return;
		this.notifyIfChanged();
	};

	private handleStackItemPopped = (event: YjsStackEvent): void => {
		if (this.destroyed) return;
		// Capture metadata from popped items
		this.lastMeta = event.stackItem.meta;
		this.notifyIfChanged();
	};

	private notifyIfChanged(): void {
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

	undo(): boolean {
		if (this.destroyed || !this.canUndo()) return false;
		this.undoManager.undo();
		return true;
	}

	redo(): boolean {
		if (this.destroyed || !this.canRedo()) return false;
		this.undoManager.redo();
		return true;
	}

	canUndo(): boolean {
		if (this.destroyed) return false;
		return this.undoManager.undoStack.length > 0;
	}

	canRedo(): boolean {
		if (this.destroyed) return false;
		return this.undoManager.redoStack.length > 0;
	}

	stopCapturing(): void {
		this.undoManager.stopCapturing();
	}

	clear(): void {
		this.undoManager.clear();
		this.lastMeta = null;
		this.notifyIfChanged();
	}

	onStackChange(handler: (event: UndoStackChangeEvent) => void): Unsubscribe {
		this.stackChangeHandlers.add(handler);
		return () => {
			this.stackChangeHandlers.delete(handler);
		};
	}

	setMeta<V>(key: string, value: V): void {
		// Store metadata on the current (most recent) stack item
		const currentItem = this.undoManager.undoStack[this.undoManager.undoStack.length - 1] as
			| YjsStackItem
			| undefined;
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

		this.undoManager.off('stack-item-added', this.handleStackChange);
		this.undoManager.off('stack-item-popped', this.handleStackItemPopped);
		this.undoManager.destroy();
		this.stackChangeHandlers.clear();
		this.lastMeta = null;
	}
}
