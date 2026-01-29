import { defineStore, storeToRefs } from 'pinia';
import { STORES } from '@n8n/stores';
import { useWorkflowsStore } from './workflows.store';

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
	return defineStore(`${STORES.WORKFLOW_DOCUMENTS}/${id}`, () => {
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
