import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores';
import { useWorkflowsStore } from './workflows.store';

export const createWorkflowDocumentStore = (id: string) =>
	defineStore(`${STORES.WORKFLOW_DOCUMENTS}/${id}`, () => {
		const workflowsStore = useWorkflowsStore();

		// Return the actual refs directly (not wrapped in computed)
		// This allows mutations and proper reactivity
		// In the future, this will store per-document state
		return {
			workflow: workflowsStore.workflow,
			workflowObject: workflowsStore.workflowObject,
		};
	});

const storesCache = new Map<string, ReturnType<typeof createWorkflowDocumentStore>>();

export function useWorkflowDocumentsStore(id: string) {
	if (!storesCache.has(id)) {
		storesCache.set(id, createWorkflowDocumentStore(id));
	}

	return storesCache.get(id)!();
}
