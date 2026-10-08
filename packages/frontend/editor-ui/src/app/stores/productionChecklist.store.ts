import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useProductionChecklistStore = defineStore('productionChecklist', () => {
	// Keep the evaluations card hidden while the checklist waits for a modal or is open.
	const activeWorkflowId = ref<string | null>(null);

	return { activeWorkflowId };
});
