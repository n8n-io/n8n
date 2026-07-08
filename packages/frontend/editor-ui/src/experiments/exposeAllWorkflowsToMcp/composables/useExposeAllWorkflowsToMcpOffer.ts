import { useUIStore } from '@/app/stores/ui.store';
import { EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY } from '@/experiments/exposeAllWorkflowsToMcp/constants';
import { useExposeAllWorkflowsToMcpStore } from '@/experiments/exposeAllWorkflowsToMcp/stores/exposeAllWorkflowsToMcp.store';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';

export function useExposeAllWorkflowsToMcpOffer() {
	const experimentStore = useExposeAllWorkflowsToMcpStore();
	const mcpStore = useMCPStore();
	const uiStore = useUIStore();

	/**
	 * Opens the expose-all modal for enrolled users with at least one eligible
	 * workflow. Failures of the eligibility probe are swallowed — the offer is
	 * best-effort and must not disturb the flow that triggered it.
	 */
	async function offerToExposeAllWorkflows(onExposed: () => Promise<void> | void) {
		if (!experimentStore.isEnabled) {
			return;
		}
		try {
			const eligible = await mcpStore.getMcpEligibleWorkflows({ take: 1 });
			if (eligible.count === 0) {
				return;
			}
		} catch {
			return;
		}
		uiStore.openModalWithData({
			name: EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY,
			data: { onExposed },
		});
	}

	return { offerToExposeAllWorkflows };
}
