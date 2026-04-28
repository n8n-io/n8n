import type {
	ApiKey,
	ListOAuthClientsResponseDto,
	DeleteOAuthClientResponseDto,
} from '@n8n/api-types';
import type { WorkflowListItem } from '@/Interface';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest, getFullApiResponse } from '@n8n/rest-api-client';

export type McpSettingsResponse = {
	mcpAccessEnabled: boolean;
};

export type ToggleWorkflowsMcpAccessTarget =
	| { workflowIds: string[] }
	| { projectId: string }
	| { folderId: string };

export type ToggleWorkflowsMcpAccessResponse = {
	updatedCount: number;
	skippedCount: number;
	failedCount: number;
	updatedIds?: string[];
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

/**
 * Bulk-toggles MCP availability for a set of workflows scoped by either an
 * explicit id list, a project, or a folder (+ its descendants).
 */
export async function toggleWorkflowsMcpAccessApi(
	context: IRestApiContext,
	target: ToggleWorkflowsMcpAccessTarget,
	availableInMCP: boolean,
): Promise<ToggleWorkflowsMcpAccessResponse> {
	return await makeRestApiRequest(context, 'PATCH', '/mcp/workflows/toggle-access', {
		availableInMCP,
		...target,
	});
}

export async function fetchOAuthClients(
	context: IRestApiContext,
): Promise<ListOAuthClientsResponseDto> {
	return await makeRestApiRequest(context, 'GET', '/mcp/oauth-clients');
}

export async function deleteOAuthClient(
	context: IRestApiContext,
	clientId: string,
): Promise<DeleteOAuthClientResponseDto> {
	return await makeRestApiRequest(
		context,
		'DELETE',
		`/mcp/oauth-clients/${encodeURIComponent(clientId)}`,
	);
}

export async function fetchMcpEligibleWorkflows(
	context: IRestApiContext,
	options?: { take?: number; skip?: number; query?: string },
): Promise<{ count: number; data: WorkflowListItem[] }> {
	const params: Record<string, string | number> = {};

	if (options?.take !== undefined) {
		params.take = options.take;
	}
	if (options?.skip !== undefined) {
		params.skip = options.skip;
	}
	if (options?.query) {
		params.filter = JSON.stringify({ query: options.query });
	}

	return await getFullApiResponse<WorkflowListItem[]>(context, 'GET', '/mcp/workflows', params);
}
