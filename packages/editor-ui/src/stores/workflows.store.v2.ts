import { defineStore } from 'pinia';
import { STORES } from '@/constants';
import { computed, ref } from 'vue';
import type { IWorkflowDb } from '@/Interface';
import { useRootStore } from '@/stores/n8nRoot.store';
import { getWorkflow } from '@/api/workflows';

export const useWorkflowsStoreV2 = defineStore(STORES.WORKFLOWS_V2, () => {
	const workflowsById = ref<Record<string, IWorkflowDb>>({});
	const workflows = computed(() => Object.values(workflowsById.value));

	function addWorkflow(workflow: IWorkflowDb) {
		workflowsById.value[workflow.id] = workflow;
	}

	function removeWorkflow(id: string) {
		delete workflowsById.value[id];
	}

	async function fetchWorkflow(id: string) {
		const rootStore = useRootStore();
		const workflow = await getWorkflow(rootStore.getRestApiContext, id);

		addWorkflow(workflow);
	}

	return {
		workflowsById,
		workflows,
		addWorkflow,
		removeWorkflow,
		fetchWorkflow,
	};
});
