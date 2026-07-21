import { useTelemetry } from '@/app/composables/useTelemetry';

export function useMcp() {
	const telemetry = useTelemetry();

	const trackMcpAccessEnabledForWorkflow = (workflowId: string) => {
		telemetry.track('User gave MCP access to workflow', { workflow_id: workflowId });
	};

	const trackMcpAccessEnabledForAgent = (agentId: string) => {
		telemetry.track('User gave MCP access to agent', { agent_id: agentId });
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
