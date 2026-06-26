import { useRouter } from 'vue-router';
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
	const workflowsStore = useWorkflowsStore();
	const returnContext = useAgentReturnContextStore();

	function rememberOrigin(originNodeId?: string) {
		const workflowId = workflowsStore.workflowId;
		// No canvas origin (e.g. opened from a settings context) → no banner.
		if (!workflowId) return;
		returnContext.set({
			workflowId,
			nodeId: originNodeId ? workflowsStore.getPartialIdForNode(originNodeId) : '',
		});
	}

	async function openBuilder(projectId: string, agentId: string, originNodeId?: string) {
		rememberOrigin(originNodeId);
		await router.push({ name: AGENT_BUILDER_VIEW, params: { projectId, agentId } });
	}

	async function openAgent(projectId: string, agentId: string, originNodeId?: string) {
		rememberOrigin(originNodeId);
		await router.push({ name: AGENT_VIEW, params: { projectId, agentId } });
	}

	return { rememberOrigin, openBuilder, openAgent };
}
