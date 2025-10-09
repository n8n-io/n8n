import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export type McpSettingsResponse = {
	mcpAccessEnabled: boolean;
};

export async function getMcpSettings(context: IRestApiContext): Promise<McpSettingsResponse> {
	return await makeRestApiRequest(context, 'GET', '/mcp/settings');
}

export async function updateMcpSettings(
	context: IRestApiContext,
	enabled: boolean,
): Promise<McpSettingsResponse> {
	return await makeRestApiRequest(context, 'PATCH', '/mcp/settings', {
		mcpAccessEnabled: enabled,
	});
}
