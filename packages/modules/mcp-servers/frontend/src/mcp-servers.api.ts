import type {
	CreateMcpServerDto,
	McpServerDetailResponse,
	McpServerResponse,
	McpServerSlugAvailability,
	McpServerToolCandidate,
	McpServerToolDraftField,
	McpServerToolDraftResponse,
	McpServerToolResponse,
	UpdateMcpServerDto,
	UpdateMcpServerToolDto,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

const serverPath = (projectId: string, serverId: string) =>
	`/projects/${projectId}/mcp-servers/${serverId}`;

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
): Promise<McpServerDetailResponse> {
	return await makeRestApiRequest(context, 'GET', serverPath(projectId, serverId));
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

export async function listToolCandidates(
	context: IRestApiContext,
	projectId: string,
	serverId: string,
): Promise<McpServerToolCandidate[]> {
	return await makeRestApiRequest(
		context,
		'GET',
		`${serverPath(projectId, serverId)}/tool-candidates`,
	);
}

export async function addWorkflowTools(
	context: IRestApiContext,
	projectId: string,
	serverId: string,
	workflowIds: string[],
): Promise<McpServerToolResponse[]> {
	return await makeRestApiRequest(context, 'POST', `${serverPath(projectId, serverId)}/tools`, {
		workflowIds,
	});
}

export async function updateTool(
	context: IRestApiContext,
	projectId: string,
	serverId: string,
	toolId: string,
	changes: UpdateMcpServerToolDto,
): Promise<McpServerToolResponse> {
	return await makeRestApiRequest(
		context,
		'PATCH',
		`${serverPath(projectId, serverId)}/tools/${toolId}`,
		changes,
	);
}

export async function removeTool(
	context: IRestApiContext,
	projectId: string,
	serverId: string,
	toolId: string,
): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `${serverPath(projectId, serverId)}/tools/${toolId}`);
}

/** One model call. Without `field`, the draft writes both fields, as after an add. */
export async function draftTool(
	context: IRestApiContext,
	projectId: string,
	serverId: string,
	toolId: string,
	field?: McpServerToolDraftField,
): Promise<McpServerToolDraftResponse> {
	return await makeRestApiRequest(
		context,
		'POST',
		`${serverPath(projectId, serverId)}/tools/${toolId}/draft`,
		field ? { field } : {},
	);
}
