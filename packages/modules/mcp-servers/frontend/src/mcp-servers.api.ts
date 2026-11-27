import type {
	CreateMcpServerDto,
	McpServerResponse,
	McpServerSlugAvailability,
	UpdateMcpServerDto,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

/** Without a project id, the servers of all projects in which the user can list servers. */
export async function listMcpServers(
	context: IRestApiContext,
	projectId?: string,
): Promise<McpServerResponse[]> {
	const endpoint = projectId ? `/projects/${projectId}/mcp-servers` : '/mcp-servers';
	return await makeRestApiRequest(context, 'GET', endpoint);
}

export async function getMcpServer(
	context: IRestApiContext,
	projectId: string,
	serverId: string,
): Promise<McpServerResponse> {
	return await makeRestApiRequest(context, 'GET', `/projects/${projectId}/mcp-servers/${serverId}`);
}

export async function createMcpServer(
	context: IRestApiContext,
	projectId: string,
	body: CreateMcpServerDto,
): Promise<McpServerResponse> {
	return await makeRestApiRequest(context, 'POST', `/projects/${projectId}/mcp-servers`, body);
}

export async function checkMcpServerSlug(
	context: IRestApiContext,
	projectId: string,
	slug: string,
): Promise<McpServerSlugAvailability> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/projects/${projectId}/mcp-servers/slug-available`,
		{ slug },
	);
}

export async function updateMcpServer(
	context: IRestApiContext,
	projectId: string,
	serverId: string,
	body: UpdateMcpServerDto,
): Promise<McpServerResponse> {
	return await makeRestApiRequest(
		context,
		'PATCH',
		`/projects/${projectId}/mcp-servers/${serverId}`,
		body,
	);
}

export async function deleteMcpServer(
	context: IRestApiContext,
	projectId: string,
	serverId: string,
): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `/projects/${projectId}/mcp-servers/${serverId}`);
}
