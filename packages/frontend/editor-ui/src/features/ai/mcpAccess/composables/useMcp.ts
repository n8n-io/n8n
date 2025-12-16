import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from '@/app/constants';
import type { IWorkflowDb } from '@/Interface';
import { useTelemetry } from '@/app/composables/useTelemetry';

export function useMcp() {
	const telemetry = useTelemetry();

	const mcpTriggerMap = {
		[SCHEDULE_TRIGGER_NODE_TYPE]: 'Schedule Trigger',
		[WEBHOOK_NODE_TYPE]: 'Webhook Trigger',
		[FORM_TRIGGER_NODE_TYPE]: 'Form Trigger',
		[CHAT_TRIGGER_NODE_TYPE]: 'Chat Trigger',
	};

	/**
	 * Determines if MCP access can be toggled for a given workflow.
	 * Workflow is eligible if it contains at least one of these (enabled) trigger nodes:
	 * - Schedule trigger
	 * - Webhook trigger
	 * - Form trigger
	 * - Chat trigger
	 * @param workflow
	 */
	const isEligibleForMcpAccess = (workflow: IWorkflowDb) => {
		return workflow.nodes.some(
			(node) => Object.keys(mcpTriggerMap).includes(node.type) && node.disabled !== true,
		);
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
		mcpTriggerMap,
	};
}
