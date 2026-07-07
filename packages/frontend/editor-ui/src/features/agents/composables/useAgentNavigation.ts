import { useRouter } from 'vue-router';
import { useWorkflowId } from '@/app/composables/useWorkflowId';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useAgentReturnContextStore } from '../agentReturnContext.store';
import { AGENT_BUILDER_VIEW, AGENT_VIEW } from '../constants';

/**
 * Navigates into the agent feature while remembering the workflow + node the
 * user came from, so `AgentView` can render a "Back to workflow" banner.
 */
export function useAgentNavigation() {
	const router = useRouter();
	const workflowId = useWorkflowId();
	const workflowsStore = useWorkflowsStore();
	const returnContext = useAgentReturnContextStore();

	/**
	 * Pass `originNodeId` ONLY when the trip starts from the node's NDV: a set
	 * node id makes "Back to workflow" reopen that node's NDV. Canvas-initiated
	 * trips omit it so the return lands on the canvas.
	 */
	function rememberOrigin(agentId: string, originNodeId?: string) {
		// Only a persisted workflow has a real id to return to; a brand-new
		// (unsaved) workflow has no meaningful "back to workflow" target.
		if (workflowsStore.isNewWorkflow) return;

		const wfId = workflowsStore.workflowId || workflowId.value;
		if (!wfId) return;

		returnContext.set({ workflowId: wfId, nodeId: originNodeId ?? '', agentId });
	}

	async function navigateWithOrigin(
		name: string,
		projectId: string,
		agentId: string,
		originNodeId?: string,
	) {
		// Set before push so the destination view finds the context on mount, but
		// clear it if the navigation is aborted (e.g. an unsaved-changes guard
		// declined).
		rememberOrigin(agentId, originNodeId);

		try {
			const failure = await router.push({ name, params: { projectId, agentId } });
			if (failure) returnContext.clear();
		} catch (error) {
			returnContext.clear();
			throw error;
		}
	}

	async function openBuilder(projectId: string, agentId: string, originNodeId?: string) {
		await navigateWithOrigin(AGENT_BUILDER_VIEW, projectId, agentId, originNodeId);
	}

	async function openAgent(projectId: string, agentId: string, originNodeId?: string) {
		await navigateWithOrigin(AGENT_VIEW, projectId, agentId, originNodeId);
	}

	return { rememberOrigin, openBuilder, openAgent };
}
