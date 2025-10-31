import { WEBHOOK_NODE_TYPE } from '@/app/constants';
import type { IWorkflowDb } from '@/Interface';
import { useTelemetry } from '@/app/composables/useTelemetry';

export function useMcp() {
	const telemetry = useTelemetry();

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

	const trackMcpAccessEnabledForWorkflow = (workflowId: string) => {
		telemetry.track('User gave MCP access to workflow', { workflow_id: workflowId });
	};

	const trackUserToggledMcpAccess = (enabled: boolean) => {
		telemetry.track('User toggled MCP access', { state: enabled });
	};

	return {
		isEligibleForMcpAccess,
		trackMcpAccessEnabledForWorkflow,
		trackUserToggledMcpAccess,
	};
}
