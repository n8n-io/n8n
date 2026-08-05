import type {
	ApiKey,
	CreateOAuthClientResponseDto,
	InstanceMcpClientStatsResponseDto,
	ListOAuthClientsResponseDto,
	DeleteOAuthClientResponseDto,
	ManualOAuthClientResponseDto,
	McpClientConnectedPeriod,
	McpClientTypeFilter,
	RotateOAuthClientSecretResponseDto,
} from '@n8n/api-types';
import type { WorkflowListItem } from '@/Interface';
import type { Agent } from '@/features/agents/agent.types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest, getFullApiResponse } from '@n8n/rest-api-client';

export type McpSettingsResponse = {
	mcpAccessEnabled: boolean;
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

/** Name and callback URLs of a manually registered client, as typed by the user. */
export type ManualOAuthClientPayload = {
	name: string;
	redirectUris: string[];
	/** Issue a client secret instead of relying on PKCE alone. */
	confidential?: boolean;
};

/**
 * Pre-registers an OAuth client for MCP clients that can't self-register over
 * DCR. Returns the generated client id, which the user pastes into the client.
 */
export async function createOAuthClient(
	context: IRestApiContext,
	payload: ManualOAuthClientPayload,
): Promise<CreateOAuthClientResponseDto> {
	return await makeRestApiRequest(context, 'POST', '/mcp/oauth-clients', payload);
}

export async function updateOAuthClient(
	context: IRestApiContext,
	clientId: string,
	payload: ManualOAuthClientPayload,
): Promise<ManualOAuthClientResponseDto> {
	return await makeRestApiRequest(
		context,
		'PATCH',
		`/mcp/oauth-clients/${encodeURIComponent(clientId)}`,
		payload,
	);
}

/** Replaces a confidential client's secret, returning the new one for display once. */
export async function rotateOAuthClientSecret(
	context: IRestApiContext,
	clientId: string,
): Promise<RotateOAuthClientSecretResponseDto> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/mcp/oauth-clients/${encodeURIComponent(clientId)}/rotate-secret`,
	);
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
): Promise<{ count: number; data: Agent[] }> {
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

	return await getFullApiResponse<Agent[]>(context, 'GET', '/mcp/agents', params);
}
