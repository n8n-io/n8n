import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	InstanceAiMcpConnectionResponse,
	InstanceAiMcpConnectionToolResponse,
	InstanceAiMcpToolFilter,
	McpRegistryServerResponse,
} from '@n8n/api-types';

export interface CreateMcpConnectionBody {
	serverSlug: string;
	credentialId: string;
}

export interface UpdateMcpConnectionBody {
	toolFilter: InstanceAiMcpToolFilter | null;
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

export async function fetchMcpConnectionTools(
	context: IRestApiContext,
	id: string,
): Promise<InstanceAiMcpConnectionToolResponse[]> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/instance-ai/mcp/connections/${encodeURIComponent(id)}/tools`,
	);
}
