import type { WorkflowReviewPolicyView } from '@n8n/api-types';
import { defineStore } from 'pinia';
import { ref } from 'vue';

/** Effective approval requirements for the workflows this session has loaded. */
export const useWorkflowReviewPolicyStore = defineStore('workflowReviewPolicy', () => {
	const byWorkflowId = ref<Record<string, WorkflowReviewPolicyView>>({});

	function get(workflowId: string): WorkflowReviewPolicyView | undefined {
		return byWorkflowId.value[workflowId];
	}

	function set(workflowId: string, policy: WorkflowReviewPolicyView): void {
		byWorkflowId.value = { ...byWorkflowId.value, [workflowId]: policy };
	}

	return { get, set };
});
