import { useExecutingNode } from '@/composables/useExecutingNode';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';

// This store acts as a temporary home for per-workflow state moved out of workflows.store.ts
// intended for the useWorkflowState composable until we inject a single instance
// of it for any applicable component
export const useWorkflowStateStore = defineStore(STORES.WORKFLOW_STATE, () => {
	const executingNode = useExecutingNode();

	return {
		executingNode,
	};
});
