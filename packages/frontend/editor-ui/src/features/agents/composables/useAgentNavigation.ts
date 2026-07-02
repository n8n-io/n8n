import { useRouter } from 'vue-router';
import { useWorkflowId } from '@/app/composables/useWorkflowId';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useAgentReturnContextStore } from '../agentReturnContext.store';
import { AGENT_BUILDER_VIEW, AGENT_VIEW } from '../constants';

/**
 * Navigates into the agent feature while remembering the workflow + node the
 * user came from, so `AgentView` can render a "Back to workflow" banner.
 *
 * `openBuilder` powers the AI Agent node's inline-create round-trip; `openAgent`
 * is the shared seam the canvas agent card (AGENT-274) routes its open (→)
 * affordance through, so opening an existing agent from the card also sets the
 * return context.
 */
export function useAgentNavigation() {
	const router = useRouter();
	const workflowId = useWorkflowId();
	const workflowsStore = useWorkflowsStore();
	const returnContext = useAgentReturnContextStore();

	function rememberOrigin(agentId: string, originNodeId?: string) {
		// Only a persisted workflow has a real id to return to; a brand-new
		// (unsaved) workflow has no meaningful "back to workflow" target.
		if (workflowsStore.isNewWorkflow) return;

		const wfId = workflowsStore.workflowId || workflowId.value;
		if (!wfId) return;

		returnContext.set({ workflowId: wfId, nodeId: originNodeId ?? '', agentId });
	}

	async function openBuilder(projectId: string, agentId: string, originNodeId?: string) {
		rememberOrigin(agentId, originNodeId);
		await router.push({ name: AGENT_BUILDER_VIEW, params: { projectId, agentId } });
	}

	async function openAgent(projectId: string, agentId: string, originNodeId?: string) {
		rememberOrigin(agentId, originNodeId);
		await router.push({ name: AGENT_VIEW, params: { projectId, agentId } });
	}

	return { rememberOrigin, openBuilder, openAgent };
}
