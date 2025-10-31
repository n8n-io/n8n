import type { ApiKey } from '@n8n/api-types';
import type { IWorkflowSettings } from '@/Interface';
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

export async function fetchApiKey(context: IRestApiContext): Promise<ApiKey> {
	return await makeRestApiRequest(context, 'GET', '/mcp/api-key');
}

export async function rotateApiKey(context: IRestApiContext): Promise<ApiKey> {
	return await makeRestApiRequest(context, 'POST', '/mcp/api-key/rotate');
}

export async function toggleWorkflowMcpAccessApi(
	context: IRestApiContext,
	workflowId: string,
	availableInMCP: boolean,
): Promise<{ id: string; settings: IWorkflowSettings | undefined; versionId: string }> {
	return await makeRestApiRequest(
		context,
		'PATCH',
		`/mcp/workflows/${encodeURIComponent(workflowId)}/toggle-access`,
		{
			availableInMCP,
		},
	);
}
