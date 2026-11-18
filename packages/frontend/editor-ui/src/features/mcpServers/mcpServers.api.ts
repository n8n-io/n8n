import type {
	AddMcpServerResourceDto,
	AddMcpServerToolDto,
	CreateMcpServerDto,
	McpServerAnalyticsDto,
	McpServerCallListDto,
	McpServerCallStatus,
	McpServerCreatedApiKeyDto,
	McpServerDetailDto,
	McpServerPlaygroundRequestDto,
	McpServerPlaygroundResultDto,
	McpServerShareDto,
	McpServerSkillTargetDto,
	McpServerSummaryDto,
	McpServerToolTargetDto,
	UpdateMcpServerDto,
	UpdateMcpServerToolDto,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

const BASE = '/mcp-servers';

export async function listMcpServers(context: IRestApiContext): Promise<McpServerSummaryDto[]> {
	return await makeRestApiRequest(context, 'GET', BASE);
}

export async function createMcpServer(
	context: IRestApiContext,
	body: CreateMcpServerDto,
): Promise<McpServerDetailDto> {
	return await makeRestApiRequest(context, 'POST', BASE, body);
}

export async function getMcpServer(
	context: IRestApiContext,
	serverId: string,
): Promise<McpServerDetailDto> {
	return await makeRestApiRequest(context, 'GET', `${BASE}/${serverId}`);
}

export async function updateMcpServer(
	context: IRestApiContext,
	serverId: string,
	body: UpdateMcpServerDto,
): Promise<McpServerDetailDto> {
	return await makeRestApiRequest(context, 'PATCH', `${BASE}/${serverId}`, body);
}

export async function deleteMcpServer(context: IRestApiContext, serverId: string): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `${BASE}/${serverId}`);
}

export async function listMcpServerTargets(
	context: IRestApiContext,
	search = '',
): Promise<McpServerToolTargetDto[]> {
	return await makeRestApiRequest(context, 'GET', `${BASE}/targets`, { search });
}

export async function listMcpServerSkills(
	context: IRestApiContext,
	search = '',
): Promise<McpServerSkillTargetDto[]> {
	return await makeRestApiRequest(context, 'GET', `${BASE}/skills`, { search });
}

export async function addMcpServerTool(
	context: IRestApiContext,
	serverId: string,
	body: AddMcpServerToolDto,
): Promise<McpServerDetailDto> {
	return await makeRestApiRequest(context, 'POST', `${BASE}/${serverId}/tools`, body);
}

export async function updateMcpServerTool(
	context: IRestApiContext,
	serverId: string,
	toolId: string,
	body: UpdateMcpServerToolDto,
): Promise<McpServerDetailDto> {
	return await makeRestApiRequest(context, 'PATCH', `${BASE}/${serverId}/tools/${toolId}`, body);
}

export async function removeMcpServerTool(
	context: IRestApiContext,
	serverId: string,
	toolId: string,
): Promise<McpServerDetailDto> {
	return await makeRestApiRequest(context, 'DELETE', `${BASE}/${serverId}/tools/${toolId}`);
}

export async function addMcpServerResource(
	context: IRestApiContext,
	serverId: string,
	body: AddMcpServerResourceDto,
): Promise<McpServerDetailDto> {
	return await makeRestApiRequest(context, 'POST', `${BASE}/${serverId}/resources`, body);
}

export async function removeMcpServerResource(
	context: IRestApiContext,
	serverId: string,
	resourceId: string,
): Promise<McpServerDetailDto> {
	return await makeRestApiRequest(context, 'DELETE', `${BASE}/${serverId}/resources/${resourceId}`);
}

export async function createMcpServerApiKey(
	context: IRestApiContext,
	serverId: string,
	label: string,
): Promise<McpServerCreatedApiKeyDto> {
	return await makeRestApiRequest(context, 'POST', `${BASE}/${serverId}/api-keys`, { label });
}

export async function revokeMcpServerApiKey(
	context: IRestApiContext,
	serverId: string,
	keyId: string,
): Promise<McpServerDetailDto> {
	return await makeRestApiRequest(context, 'DELETE', `${BASE}/${serverId}/api-keys/${keyId}`);
}

export async function setMcpServerOAuthUserRevoked(
	context: IRestApiContext,
	serverId: string,
	userId: string,
	revoked: boolean,
): Promise<McpServerDetailDto> {
	const action = revoked ? 'revoke' : 'restore';
	return await makeRestApiRequest(
		context,
		'POST',
		`${BASE}/${serverId}/oauth-users/${userId}/${action}`,
	);
}

export interface McpServerCallsFilter {
	tool?: string;
	caller?: string;
	status?: McpServerCallStatus;
	limit?: number;
}

export async function listMcpServerCalls(
	context: IRestApiContext,
	serverId: string,
	filter: McpServerCallsFilter,
): Promise<McpServerCallListDto> {
	return await makeRestApiRequest(context, 'GET', `${BASE}/${serverId}/calls`, { ...filter });
}

export async function getMcpServerAnalytics(
	context: IRestApiContext,
	serverId: string,
	days: number,
): Promise<McpServerAnalyticsDto> {
	return await makeRestApiRequest(context, 'GET', `${BASE}/${serverId}/analytics`, { days });
}

export async function sendMcpServerPlayground(
	context: IRestApiContext,
	serverId: string,
	body: McpServerPlaygroundRequestDto,
): Promise<McpServerPlaygroundResultDto> {
	return await makeRestApiRequest(context, 'POST', `${BASE}/${serverId}/playground`, body);
}

/** The share page for a signed-in user. */
export async function getMcpServerShare(
	context: IRestApiContext,
	slug: string,
): Promise<McpServerShareDto> {
	return await makeRestApiRequest(context, 'GET', `${BASE}/share/${slug}`);
}

/** The share page with no login. Answers 401 when the owner did not make it public. */
export async function getMcpServerPublicShare(
	context: IRestApiContext,
	slug: string,
): Promise<McpServerShareDto> {
	return await makeRestApiRequest(context, 'GET', `/mcp-servers-public/${slug}`);
}
