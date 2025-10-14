import { WEBHOOK_NODE_TYPE } from '@/constants';
import type { IWorkflowDb } from '@/Interface';

export function useMcp() {
	/**
	 * Checks if MCP access can be enabled for the given workflow.
	 * A workflow is eligible if it is active and has at least one enabled webhook trigger.
	 */
	const isEligibleForMcpAccess = (workflow: IWorkflowDb) => {
		if (!workflow.active) {
			return false;
		}
		// If it's active, check if workflow has at least one enabled webhook trigger:
		return workflow.nodes.some((node) => node.type === WEBHOOK_NODE_TYPE && node.disabled !== true);
	};

	return {
		isEligibleForMcpAccess,
	};
}
