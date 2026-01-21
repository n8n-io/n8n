import { useExecutingNode } from '@/app/composables/useExecutingNode';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { ref } from 'vue';

// This store acts as a temporary home for per-workflow state moved out of workflows.store.ts
// intended for the useWorkflowState composable until we inject a single instance
// of it for any applicable component
export const useWorkflowStateStore = defineStore(STORES.WORKFLOW_STATE, () => {
	// Marker used to indicate that the currently open template can be executed without credential setup
	const readyToDemo = ref(false);

	const executingNode = useExecutingNode();

	return {
		readyToDemo,
		executingNode,
	};
});
