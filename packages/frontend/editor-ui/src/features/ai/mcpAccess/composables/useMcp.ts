import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

export function useMcp() {
	const telemetry = useTelemetry();

	const trackMcpAccessEnabledForWorkflow = (workflowId: string) => {
		telemetry.track(TELEMETRY_EVENT.MCP.USER_GAVE_MCP_ACCESS_TO_WORKFLOW, {
			workflow_id: workflowId,
		});
	};

	const trackMcpAccessEnabledForAgent = (agentId: string) => {
		telemetry.track(TELEMETRY_EVENT.AGENTS.USER_GAVE_MCP_ACCESS_TO_AGENT, { agent_id: agentId });
	};

	const trackUserToggledMcpAccess = (enabled: boolean) => {
		telemetry.track(TELEMETRY_EVENT.MCP.USER_TOGGLED_MCP_ACCESS, { state: enabled });
	};

	const trackAutoExposeToggled = ({
		enabled,
		source,
	}: { enabled: boolean; source: 'settings' | 'expose_all' }) => {
		telemetry.track(TELEMETRY_EVENT.MCP.AUTO_EXPOSE_NEW_WORKFLOWS_TOGGLED, { enabled, source });
	};

	return {
		trackMcpAccessEnabledForWorkflow,
		trackMcpAccessEnabledForAgent,
		trackUserToggledMcpAccess,
		trackAutoExposeToggled,
	};
}
