import type { Implementation } from "@modelcontextprotocol/server";

export function getMcpClientTelemetryProperties(hostVersion?: Implementation) {
	return {
		...(hostVersion?.name ? { mcp_client_name: hostVersion.name } : {}),
		...(hostVersion?.version ? { mcp_client_version: hostVersion.version } : {}),
	};
}
