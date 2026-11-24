import type { Implementation } from '@modelcontextprotocol/sdk/types.js';

export function getMcpClientTelemetryProperties(hostVersion?: Implementation) {
	return {
		...(hostVersion?.name ? { mcp_client_name: hostVersion.name } : {}),
		...(hostVersion?.version ? { mcp_client_version: hostVersion.version } : {}),
	};
}
