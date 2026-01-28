import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { IWorkflowDb } from '@/Interface';

export const useWorkflowDocumentsStore = defineStore(STORES.WORKFLOW_DOCUMENTS, () => {
	const workflowsStore = useWorkflowsStore();

	// Reference to the current workflow ID from the workflows store
	const workflowDocumentId = computed<string>(() => workflowsStore.workflowId);

	// Computed map where entries reference the workflow from workflowsStore
	// Keyed by the current workflow ID
	const workflowDocumentsById = computed<Record<string, IWorkflowDb>>(() => ({
		[workflowsStore.workflowId]: workflowsStore.workflow,
	}));

	// Computed map where entries reference the workflowObject from workflowsStore
	// Keyed by the current workflow ID
	const workflowObjectsById = computed(() => ({
		[workflowsStore.workflowId]: workflowsStore.workflowObject,
	}));

	return {
		workflowDocumentId,
		workflowDocumentsById,
		workflowObjectsById,
	};
});
