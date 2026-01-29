import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores';
import { useWorkflowsStore } from './workflows.store';
import { computed } from 'vue';

export const createWorkflowDocumentStore = (id: string) =>
	defineStore(`${STORES.WORKFLOW_DOCUMENTS}/${id}`, () => {
		const workflowsStore = useWorkflowsStore();

		const workflow = computed(() => workflowsStore.workflow);
		const workflowObject = computed(() => workflowsStore.workflowObject);

		return {
			workflow,
			workflowObject,
		};
	});

const storesCache = new Map<string, ReturnType<typeof createWorkflowDocumentStore>>();

export function useWorkflowDocumentsStore(id: string) {
	if (!storesCache.has(id)) {
		storesCache.set(id, createWorkflowDocumentStore(id));
	}

	return storesCache.get(id)!();
}
