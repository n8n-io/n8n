import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

export function useMcp() {
	const telemetry = useTelemetry();

	const trackMcpAccessEnabledForWorkflow = (workflowId: string) => {
		telemetry.track('User gave MCP access to workflow', { workflow_id: workflowId });
	};

	const trackMcpAccessEnabledForAgent = (agentId: string) => {
		telemetry.track(TELEMETRY_EVENT.AGENTS.USER_GAVE_MCP_ACCESS_TO_AGENT, { agent_id: agentId });
	};

	const trackUserToggledMcpAccess = (enabled: boolean) => {
		telemetry.track('User toggled MCP access', { state: enabled });
	};

	return {
		trackMcpAccessEnabledForWorkflow,
		trackMcpAccessEnabledForAgent,
		trackUserToggledMcpAccess,
	};
}
