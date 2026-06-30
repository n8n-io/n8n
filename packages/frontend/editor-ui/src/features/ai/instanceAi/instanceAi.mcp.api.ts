import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { InstanceAiMcpConnectionResponse, McpRegistryServerResponse } from '@n8n/api-types';

export interface CreateMcpConnectionBody {
	serverSlug: string;
	credentialId: string;
}

export interface UpdateMcpConnectionBody {
	credentialId?: string;
	inclusionMode?: 'all' | 'selected' | 'except';
	selectedTools?: string[];
	excludedTools?: string[];
}

export async function fetchMcpRegistryServers(
	context: IRestApiContext,
): Promise<McpRegistryServerResponse[]> {
	return await makeRestApiRequest(context, 'GET', '/mcp-registry/servers');
}

export async function fetchMcpConnections(
	context: IRestApiContext,
): Promise<InstanceAiMcpConnectionResponse[]> {
	return await makeRestApiRequest(context, 'GET', '/instance-ai/mcp/connections');
}

export async function createMcpConnection(
	context: IRestApiContext,
	body: CreateMcpConnectionBody,
): Promise<InstanceAiMcpConnectionResponse> {
	return await makeRestApiRequest(context, 'POST', '/instance-ai/mcp/connections', body);
}

export async function updateMcpConnection(
	context: IRestApiContext,
	id: string,
	body: UpdateMcpConnectionBody,
): Promise<InstanceAiMcpConnectionResponse> {
	return await makeRestApiRequest(
		context,
		'PATCH',
		`/instance-ai/mcp/connections/${encodeURIComponent(id)}`,
		body,
	);
}

export async function deleteMcpConnection(context: IRestApiContext, id: string): Promise<void> {
	await makeRestApiRequest(
		context,
		'DELETE',
		`/instance-ai/mcp/connections/${encodeURIComponent(id)}`,
	);
}
