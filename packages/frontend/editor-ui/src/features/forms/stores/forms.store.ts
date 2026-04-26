import { defineStore } from 'pinia';
import { ref } from 'vue';
import { FORM_TRIGGER_NODE_TYPE } from '@/app/constants';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

export const useFormsStore = defineStore('forms', () => {
	const workflowsListStore = useWorkflowsListStore();

	const hasFormWorkflows = ref<boolean | null>(null);

	async function checkForFormWorkflows() {
		if (hasFormWorkflows.value !== null) return;
		const results = await workflowsListStore.fetchWorkflowsPage(undefined, 1, 1, undefined, {
			triggerNodeTypes: [FORM_TRIGGER_NODE_TYPE],
		});
		hasFormWorkflows.value = results.length > 0;
	}

	return { hasFormWorkflows, checkForFormWorkflows };
});
