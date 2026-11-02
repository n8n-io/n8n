import type {
	ApiKey,
	InstanceMcpClientStatsResponseDto,
	ListOAuthClientsResponseDto,
	DeleteOAuthClientResponseDto,
	McpClientConnectedPeriod,
	McpClientTypeFilter,
} from '@n8n/api-types';
import type { McpAgent, McpWorkflow } from './mcp.types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest, getFullApiResponse } from '@n8n/rest-api-client';

export type McpSettingsResponse = {
	mcpAccessEnabled: boolean;
	autoExposeNewWorkflows: boolean;
};

export type ToggleWorkflowsMcpAccessTarget =
	| { workflowIds: string[] }
	| { projectId: string }
	| { folderId: string }
	| { allWorkflows: true };

export type ToggleWorkflowsMcpAccessResponse = {
	updatedCount: number;
	unchangedCount: number;
	skippedCount: number;
	failedCount: number;
	updatedIds?: string[];
	unchangedIds?: string[];
	autoExposeNewWorkflows?: boolean;
};

export type ToggleAgentsMcpAccessTarget =
	| { agentIds: string[] }
	| { projectId: string }
	| { allAgents: true };

export type ToggleAgentsMcpAccessResponse = {
	updatedCount: number;
	updatedIds?: string[];
	unchangedIds?: string[];
};

export async function updateMcpSettings(
	context: IRestApiContext,
	settings: { mcpAccessEnabled?: boolean; autoExposeNewWorkflows?: boolean },
): Promise<McpSettingsResponse> {
	return await makeRestApiRequest(context, 'PATCH', '/mcp/settings', settings);
}

export async function fetchApiKey(context: IRestApiContext): Promise<ApiKey> {
	return await makeRestApiRequest(context, 'GET', '/mcp/api-key');
}

export async function rotateApiKey(context: IRestApiContext): Promise<ApiKey> {
	return await makeRestApiRequest(context, 'POST', '/mcp/api-key/rotate');
}

export async function getAllowedRedirectUris(
	context: IRestApiContext,
): Promise<{ uris: string[] }> {
	return await makeRestApiRequest(context, 'GET', '/mcp/oauth/allowed-redirect-uris');
}

export async function updateAllowedRedirectUris(
	context: IRestApiContext,
	uris: string[],
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(context, 'PATCH', '/mcp/oauth/allowed-redirect-uris', { uris });
}

/**
 * Bulk-toggles MCP availability for a set of workflows scoped by either an
 * explicit id list, a project, a folder (+ its descendants), or all
 * workflows the user can update.
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

export type FetchOAuthClientsOptions = {
	ownership?: 'mine' | 'all';
	skip?: number;
	take?: number;
	name?: string;
	ownerId?: string;
	type?: McpClientTypeFilter;
	connected?: McpClientConnectedPeriod;
};

export async function fetchOAuthClients(
	context: IRestApiContext,
	options: FetchOAuthClientsOptions = {},
): Promise<ListOAuthClientsResponseDto> {
	const params = Object.fromEntries(
		Object.entries(options).filter(([, value]) => value !== undefined),
	);
	return await makeRestApiRequest(
		context,
		'GET',
		'/mcp/oauth-clients',
		Object.keys(params).length > 0 ? params : undefined,
	);
}

export async function fetchInstanceMcpClientStats(
	context: IRestApiContext,
): Promise<InstanceMcpClientStatsResponseDto> {
	return await makeRestApiRequest(context, 'GET', '/mcp/oauth-clients/instance-stats');
}

export async function deleteOAuthClient(
	context: IRestApiContext,
	clientId: string,
	userId?: string,
): Promise<DeleteOAuthClientResponseDto> {
	return await makeRestApiRequest(
		context,
		'DELETE',
		`/mcp/oauth-clients/${encodeURIComponent(clientId)}`,
		userId ? { userId } : undefined,
	);
}

export async function fetchMcpEligibleWorkflows(
	context: IRestApiContext,
	options?: { take?: number; skip?: number; query?: string },
): Promise<{ count: number; data: McpWorkflow[] }> {
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

	return await getFullApiResponse<McpWorkflow[]>(context, 'GET', '/mcp/workflows', params);
}

/**
 * Workflows already exposed to MCP, newest first. Uses the generic list endpoint:
 * `/mcp/workflows` returns only workflows that are not exposed yet.
 */
export async function fetchMcpExposedWorkflows(
	context: IRestApiContext,
	options: { skip: number; take: number },
): Promise<{ count: number; data: McpWorkflow[] }> {
	return await getFullApiResponse<McpWorkflow[]>(context, 'GET', '/workflows', {
		includeScopes: true,
		filter: { isArchived: false, availableInMCP: true },
		skip: options.skip,
		take: options.take,
		sortBy: 'updatedAt:desc',
	});
}

/**
 * Bulk-toggles MCP availability for a set of agents scoped by either an
 * explicit id list, a project, or all agents the user can update.
 */
export async function toggleAgentsMcpAccessApi(
	context: IRestApiContext,
	target: ToggleAgentsMcpAccessTarget,
	availableInMCP: boolean,
): Promise<ToggleAgentsMcpAccessResponse> {
	return await makeRestApiRequest(context, 'PATCH', '/mcp/agents/toggle-access', {
		availableInMCP,
		...target,
	});
}

export async function fetchMcpAgents(
	context: IRestApiContext,
	options?: { take?: number; skip?: number; query?: string; availableInMCP?: boolean },
): Promise<{ count: number; data: McpAgent[] }> {
	const params: Record<string, string | number> = {};
	const query = options?.query?.trim();
	const filter = {
		...(query ? { query } : {}),
		...(options?.availableInMCP !== undefined ? { availableInMCP: options.availableInMCP } : {}),
	};

	if (options?.take !== undefined) {
		params.take = options.take;
	}
	if (options?.skip !== undefined) {
		params.skip = options.skip;
	}
	if (Object.keys(filter).length > 0) {
		params.filter = JSON.stringify(filter);
	}

	return await getFullApiResponse<McpAgent[]>(context, 'GET', '/mcp/agents', params);
}
