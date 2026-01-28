import { onScopeDispose } from 'vue';
import type { VueFlowStore, NodeChange, EdgeChange } from '@vue-flow/core';

/**
 * Batched changes from Vue Flow.
 * Contains all node and edge changes that occurred within a single microtask.
 */
export interface ChangeBatch {
	nodeChanges: NodeChange[];
	edgeChanges: EdgeChange[];
}

export interface UseVueFlowChangeBatcherOptions {
	/** The Vue Flow store instance */
	instance: VueFlowStore;
}

export interface UseVueFlowChangeBatcherReturn {
	/**
	 * Register handler for batched changes.
	 * Called once per microtask with all accumulated node and edge changes.
	 */
	onChangeBatch: (handler: (batch: ChangeBatch) => void) => void;
}

/**
 * Batches Vue Flow change events into a single callback.
 *
 * ## Problem
 * Vue Flow fires onEdgesChange BEFORE onNodesChange when deleting nodes.
 * This makes it difficult to handle deletions that need both pieces of information
 * (e.g., calculating reconnection edges).
 *
 * ## Solution
 * This composable subscribes to both onNodesChange and onEdgesChange,
 * collects all changes within a microtask, and emits them as a single batch.
 *
 * The consumer receives the raw Vue Flow changes and decides what to do:
 * - Apply changes to Vue Flow state
 * - Sync to CRDT
 * - Calculate reconnection edges
 * - etc.
 *
 * @example
 * ```ts
 * const batcher = useVueFlowChangeBatcher({ instance });
 *
 * batcher.onChangeBatch((batch) => {
 *   // Apply changes to Vue Flow
 *   instance.applyNodeChanges(batch.nodeChanges);
 *   instance.applyEdgeChanges(batch.edgeChanges);
 *
 *   // Sync removals to CRDT
 *   for (const change of batch.nodeChanges) {
 *     if (change.type === 'remove') doc.removeNode(change.id);
 *   }
 * });
 * ```
 */
export function useVueFlowChangeBatcher(
	options: UseVueFlowChangeBatcherOptions,
): UseVueFlowChangeBatcherReturn {
	const { instance } = options;

	let pendingNodeChanges: NodeChange[] = [];
	let pendingEdgeChanges: EdgeChange[] = [];
	let flushScheduled = false;
	let batchHandler: ((batch: ChangeBatch) => void) | null = null;

	function scheduleFlush() {
		if (flushScheduled) return;
		flushScheduled = true;
		queueMicrotask(flush);
	}

	function flush() {
		flushScheduled = false;

		const batch: ChangeBatch = {
			nodeChanges: pendingNodeChanges,
			edgeChanges: pendingEdgeChanges,
		};

		pendingNodeChanges = [];
		pendingEdgeChanges = [];

		if (batch.nodeChanges.length > 0 || batch.edgeChanges.length > 0) {
			batchHandler?.(batch);
		}
	}

	const unsubNodesChange = instance.onNodesChange((changes) => {
		pendingNodeChanges.push(...changes);
		scheduleFlush();
	});

	const unsubEdgesChange = instance.onEdgesChange((changes) => {
		pendingEdgeChanges.push(...changes);
		scheduleFlush();
	});

	onScopeDispose(() => {
		unsubNodesChange.off();
		unsubEdgesChange.off();
	});

	return {
		onChangeBatch(handler) {
			batchHandler = handler;
		},
	};
}
