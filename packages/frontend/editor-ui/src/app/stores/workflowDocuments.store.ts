import { defineStore, storeToRefs, getActivePinia, type StoreGeneric } from 'pinia';
import { STORES } from '@n8n/stores';
import { useWorkflowsStore } from './workflows.store';

// Pinia internal type - _s is the store registry Map
type PiniaInternal = ReturnType<typeof getActivePinia> & {
	_s: Map<string, StoreGeneric>;
};

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
export function useWorkflowDocumentsStore(id: string) {
	return defineStore(getWorkflowDocumentStoreId(id), () => {
		const workflowsStore = useWorkflowsStore();

		// Use storeToRefs to get the actual refs (not unwrapped values)
		// This maintains reactivity when workflowsStore.workflow changes
		const { workflow, workflowObject } = storeToRefs(workflowsStore);

		// Return the refs directly - Pinia will handle auto-unwrapping for consumers
		// In the future, this will store per-document state
		return {
			workflow,
			workflowObject,
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
export function disposeWorkflowDocumentsStore(id: string) {
	const pinia = getActivePinia() as PiniaInternal;
	if (!pinia) return;

	const storeId = getWorkflowDocumentStoreId(id);

	// Check if the store exists in the Pinia state
	if (pinia.state.value[storeId]) {
		// Get the store instance and dispose it
		const store = pinia._s.get(storeId);
		if (store) {
			store.$dispose();
		}
		// Remove from Pinia's state
		delete pinia.state.value[storeId];
	}
}
