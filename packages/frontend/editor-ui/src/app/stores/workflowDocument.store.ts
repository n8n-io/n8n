import { defineStore, getActivePinia, type StoreGeneric } from 'pinia';
import { STORES } from '@n8n/stores';
import { inject } from 'vue';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import {
	useWorkflowDocumentPinData,
	isPinDataAction,
	type PinDataAction,
} from './workflowDocument/useWorkflowDocumentPinData';
import {
	useWorkflowDocumentTags,
	isTagAction,
	type TagAction,
} from './workflowDocument/useWorkflowDocumentTags';

export {
	getPinDataSize,
	pinDataToExecutionData,
} from './workflowDocument/useWorkflowDocumentPinData';

// Pinia internal type - _s is the store registry Map
type PiniaInternal = ReturnType<typeof getActivePinia> & {
	_s: Map<string, StoreGeneric>;
};

export type WorkflowDocumentId = `${string}@${string}`;

export function createWorkflowDocumentId(
	workflowId: string,
	version: string = 'latest',
): WorkflowDocumentId {
	return `${workflowId}@${version}`;
}

type WorkflowDocumentAction = TagAction | PinDataAction;

/**
 * Gets the store ID for a workflow document store.
 */
export function getWorkflowDocumentStoreId(id: string) {
	return `${STORES.WORKFLOW_DOCUMENTS}/${id}`;
}

/**
 * Creates a workflow document store for a specific workflow ID.
 *
 * Note: We use a factory function rather than a module-level cache because
 * Pinia store instances must be tied to the active Pinia instance. A module-level
 * cache would cause test isolation issues where stale store references persist
 * across test runs with different Pinia instances.
 *
 * Pinia internally handles store deduplication per-instance via the store ID.
 */
export function useWorkflowDocumentStore(id: WorkflowDocumentId) {
	return defineStore(getWorkflowDocumentStoreId(id), () => {
		const [workflowId, workflowVersion] = id.split('@');

		/**
		 * Handle all document actions in a CRDT-like manner.
		 * Single entry point for all mutations, enabling future CRDT sync integration.
		 */
		function onChange(action: WorkflowDocumentAction) {
			if (isTagAction(action)) {
				handleTagAction(action);
			} else if (isPinDataAction(action)) {
				handlePinDataAction(action);
			}
		}

		const {
			tags,
			setTags,
			addTags,
			removeTag,
			handleAction: handleTagAction,
		} = useWorkflowDocumentTags(onChange);

		const {
			pinData,
			setPinData,
			pinNodeData,
			unpinNodeData,
			renamePinDataNode,
			getPinDataSnapshot,
			getNodePinData,
			handleAction: handlePinDataAction,
		} = useWorkflowDocumentPinData(onChange);

		return {
			workflowId,
			workflowVersion,
			tags,
			setTags,
			addTags,
			removeTag,
			pinData,
			setPinData,
			pinNodeData,
			unpinNodeData,
			renamePinDataNode,
			getPinDataSnapshot,
			getNodePinData,
		};
	})();
}

/**
 * Disposes a workflow document store by ID.
 * Call this when a workflow document is unloaded (e.g., when navigating away from NodeView).
 *
 * This removes the store from Pinia's internal registry, freeing memory and preventing
 * stale stores from accumulating over time.
 */
export function disposeWorkflowDocumentStore(id: string) {
	const pinia = getActivePinia() as PiniaInternal;
	if (!pinia) return;

	const storeId = getWorkflowDocumentStoreId(id);

	// Check if the store exists in the Pinia state
	if (pinia.state.value[storeId]) {
		// Get the store instance
		const store = pinia._s.get(storeId);
		if (store) {
			store.$dispose();
		}
		// Remove from Pinia's state
		delete pinia.state.value[storeId];
	}
}

/**
 * Injects the workflow document store from the current component tree.
 * Returns null if not within a component context that has provided the store.
 *
 * Use this in composables/stores that need to interact with the current workflow's
 * document store but may be called outside of the NodeView tree.
 */
export function injectWorkflowDocumentStore() {
	const storeRef = inject(WorkflowDocumentStoreKey, null);
	return storeRef?.value ?? null;
}
