import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { getMcpClientBrand, getMcpClientType } from '@n8n/api-types';

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

	const trackConnectClientClicked = (source: 'settings') => {
		telemetry.track(TELEMETRY_EVENT.MCP.USER_CLICKED_CONNECT_CLIENT, { source });
	};

	const trackViewedAllClients = () => {
		telemetry.track(TELEMETRY_EVENT.MCP.USER_VIEWED_ALL_MCP_CLIENTS, {});
	};

	// Brand and type come from the client's self-registered name, so the revoke
	// can be segmented the same way the connect dialog's client slug is.
	const trackClientAccessRevoked = ({
		clientId,
		clientName,
		revokedForOther,
	}: { clientId: string; clientName: string; revokedForOther: boolean }) => {
		telemetry.track(TELEMETRY_EVENT.MCP.USER_REVOKED_MCP_CLIENT_ACCESS, {
			client_id: clientId,
			client_brand: getMcpClientBrand(clientName),
			client_type: getMcpClientType(clientName),
			revoked_for_other: revokedForOther,
		});
	};

	return {
		trackMcpAccessEnabledForWorkflow,
		trackMcpAccessEnabledForAgent,
		trackUserToggledMcpAccess,
		trackAutoExposeToggled,
		trackConnectClientClicked,
		trackViewedAllClients,
		trackClientAccessRevoked,
	};
}
