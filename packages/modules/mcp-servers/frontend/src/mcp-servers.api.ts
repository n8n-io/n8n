import type {
	McpServerDetailResponse,
	McpServerToolCandidate,
	McpServerToolResponse,
	UpdateMcpServerToolDto,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

const serverPath = (projectId: string, serverId: string) =>
	`/projects/${projectId}/mcp-servers/${serverId}`;

export async function getMcpServer(
	context: IRestApiContext,
	projectId: string,
	serverId: string,
): Promise<McpServerDetailResponse> {
	return await makeRestApiRequest(context, 'GET', serverPath(projectId, serverId));
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
