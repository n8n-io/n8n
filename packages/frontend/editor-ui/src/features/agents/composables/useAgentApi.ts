import type {
	AgentBuilderMessagesResponse,
	AgentChatMessagesResponse,
	AgentFileDto,
	AgentIntegrationStatusResponse,
	AgentSkill,
	AgentSkillMutationResponse,
	AgentTaskConfig,
	AgentTaskDto,
	AgentIntegrationSettings,
	AgentVersionListItemDto,
	ChatIntegrationDescriptor,
	CreateSlackAgentAppResponse,
	SlackAgentAppManifestResponse,
} from '@n8n/api-types';
import { getFullApiResponse, makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { AgentResource, AgentJsonConfig } from '../types';

export type ListAgentsSortBy =
	| 'name:asc'
	| 'name:desc'
	| 'createdAt:asc'
	| 'createdAt:desc'
	| 'updatedAt:asc'
	| 'updatedAt:desc';

export type ListAgentsOptions = {
	skip?: number;
	take?: number;
	sortBy?: ListAgentsSortBy;
	filter?: {
		query?: string;
	};
};

const AGENTS_LIST_PAGE_SIZE = 250;

export const listAgentsPage = async (
	context: IRestApiContext,
	projectId: string,
	options: ListAgentsOptions,
): Promise<{ count: number; data: AgentResource[] }> => {
	return await getFullApiResponse<AgentResource[]>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2`,
		options,
	);
};

export const listAgentsPageGlobal = async (
	context: IRestApiContext,
	options: ListAgentsOptions,
): Promise<{ count: number; data: AgentResource[] }> => {
	return await getFullApiResponse<AgentResource[]>(context, 'GET', '/agents/v2', options);
};

export const listAgents = async (
	context: IRestApiContext,
	projectId: string,
): Promise<AgentResource[]> => {
	const agents: AgentResource[] = [];
	let total = 0;

	do {
		const { count, data } = await listAgentsPage(context, projectId, {
			skip: agents.length,
			take: AGENTS_LIST_PAGE_SIZE,
		});
		agents.push(...data);
		total = count;

		if (data.length === 0) break;
	} while (agents.length < total);

	return agents;
};

export const getAgent = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentResource> => {
	return await makeRestApiRequest<AgentResource>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}`,
	);
};

export const createAgent = async (
	context: IRestApiContext,
	projectId: string,
	name: string,
): Promise<AgentResource> => {
	return await makeRestApiRequest<AgentResource>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2`,
		{ name },
	);
};

export const deleteAgent = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<void> => {
	await makeRestApiRequest(context, 'DELETE', `/projects/${projectId}/agents/v2/${agentId}`);
};

export const listAgentFiles = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentFileDto[]> => {
	return await makeRestApiRequest<AgentFileDto[]>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/files`,
	);
};

export const uploadAgentFiles = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	files: File[],
): Promise<AgentFileDto[]> => {
	const formData = new FormData();
	for (const file of files) {
		formData.append('files', file);
	}

	return await makeRestApiRequest<AgentFileDto[]>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/files`,
		formData,
	);
};

export const deleteAgentFile = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	fileId: string,
): Promise<void> => {
	await makeRestApiRequest(
		context,
		'DELETE',
		`/projects/${projectId}/agents/v2/${agentId}/files/${fileId}`,
	);
};

export const warmAgentKnowledgeSandbox = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<{ accepted: true }> => {
	return await makeRestApiRequest<{ accepted: true }>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/sandbox/knowledge/warmup`,
	);
};

export const connectIntegration = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	type: string,
	credentialId: string,
	settings?: AgentIntegrationSettings,
): Promise<{ status: string; agent?: AgentResource }> => {
	return await makeRestApiRequest(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/integrations/connect`,
		{ type, credentialId, ...(settings ? { settings } : {}) },
	);
};

export const disconnectIntegration = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	type: string,
	credentialId: string,
): Promise<{ status: string }> => {
	return await makeRestApiRequest(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/integrations/disconnect`,
		{ type, credentialId },
	);
};

export const getIntegrationStatus = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentIntegrationStatusResponse> => {
	return await makeRestApiRequest<AgentIntegrationStatusResponse>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/integrations/status`,
	);
};

export const getAgentTasks = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentTaskDto[]> => {
	return await makeRestApiRequest<AgentTaskDto[]>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/tasks`,
	);
};

export const createAgentTask = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	payload: AgentTaskConfig & { enabled?: boolean },
): Promise<AgentTaskDto> => {
	return await makeRestApiRequest<AgentTaskDto>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/tasks`,
		payload,
	);
};

export const updateAgentTask = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	taskId: string,
	payload: Partial<AgentTaskConfig>,
): Promise<AgentTaskDto> => {
	return await makeRestApiRequest<AgentTaskDto>(
		context,
		'PATCH',
		`/projects/${projectId}/agents/v2/${agentId}/tasks/${taskId}`,
		payload,
	);
};

export const deleteAgentTask = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	taskId: string,
): Promise<{ success: true }> => {
	return await makeRestApiRequest<{ success: true }>(
		context,
		'DELETE',
		`/projects/${projectId}/agents/v2/${agentId}/tasks/${taskId}`,
	);
};

export const runAgentTask = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	taskId: string,
): Promise<{ success: true }> => {
	return await makeRestApiRequest<{ success: true }>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/tasks/${taskId}/run`,
	);
};

// Backward-compatible aliases
export const connectSlack = async (
	ctx: IRestApiContext,
	projectId: string,
	agentId: string,
	credentialId: string,
) => await connectIntegration(ctx, projectId, agentId, 'slack', credentialId);

export const disconnectSlack = async (
	ctx: IRestApiContext,
	projectId: string,
	agentId: string,
	credentialId: string,
) => await disconnectIntegration(ctx, projectId, agentId, 'slack', credentialId);

export const getSlackStatus = getIntegrationStatus;

export const createSlackAgentApp = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	appConfigurationToken: string,
): Promise<CreateSlackAgentAppResponse> => {
	return await makeRestApiRequest<CreateSlackAgentAppResponse>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/integrations/slack/app`,
		{ appConfigurationToken },
	);
};

export const getSlackAgentAppManifest = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<SlackAgentAppManifestResponse> => {
	return await makeRestApiRequest<SlackAgentAppManifestResponse>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/integrations/slack/manifest`,
	);
};

export interface ModelInfo {
	id: string;
	name: string;
	releaseDate?: string;
	reasoning: boolean;
	toolCall: boolean;
}

export interface ProviderInfo {
	id: string;
	name: string;
	models: Record<string, ModelInfo>;
}

export type ProviderCatalog = Record<string, ProviderInfo>;

export const getModelCatalog = async (
	context: IRestApiContext,
	projectId: string,
): Promise<ProviderCatalog> => {
	return await makeRestApiRequest<ProviderCatalog>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/catalog/models`,
	);
};

export const publishAgent = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	versionId?: string,
): Promise<AgentResource> => {
	return await makeRestApiRequest<AgentResource>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/publish`,
		versionId ? { versionId } : undefined,
	);
};

export const unpublishAgent = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentResource> => {
	return await makeRestApiRequest<AgentResource>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/unpublish`,
	);
};

export const revertAgentToPublished = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentResource> => {
	return await makeRestApiRequest<AgentResource>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/revert-to-published`,
	);
};

export const revertAgentToVersion = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	versionId: string,
): Promise<AgentResource> => {
	return await makeRestApiRequest<AgentResource>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/revert-to-version`,
		{ versionId },
	);
};

export const listAgentVersions = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	params: { take: number; skip: number },
): Promise<AgentVersionListItemDto[]> => {
	return await makeRestApiRequest<AgentVersionListItemDto[]>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/versions`,
		params,
	);
};

export const getAgentConfig = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentJsonConfig> => {
	return await makeRestApiRequest<AgentJsonConfig>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/config`,
	);
};

export const updateAgentConfig = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	config: AgentJsonConfig,
): Promise<{ config: AgentJsonConfig; versionId: string | null }> => {
	return await makeRestApiRequest(
		context,
		'PUT',
		`/projects/${projectId}/agents/v2/${agentId}/config`,
		{ config },
	);
};

export const createAgentSkill = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	skill: AgentSkill,
): Promise<AgentSkillMutationResponse> => {
	return await makeRestApiRequest<AgentSkillMutationResponse>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/skills`,
		skill,
	);
};

export const updateAgentSkill = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	skillId: string,
	updates: Partial<AgentSkill>,
): Promise<AgentSkillMutationResponse> => {
	return await makeRestApiRequest<AgentSkillMutationResponse>(
		context,
		'PATCH',
		`/projects/${projectId}/agents/v2/${agentId}/skills/${skillId}`,
		updates,
	);
};

export const getBuilderMessages = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentBuilderMessagesResponse> => {
	return await makeRestApiRequest<AgentBuilderMessagesResponse>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/build/messages`,
	);
};

export const clearBuilderMessages = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<void> => {
	await makeRestApiRequest(
		context,
		'DELETE',
		`/projects/${projectId}/agents/v2/${agentId}/build/messages`,
	);
};

export const getChatMessages = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	threadId: string,
): Promise<AgentChatMessagesResponse> => {
	return await makeRestApiRequest<AgentChatMessagesResponse>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/chat/${threadId}/messages`,
	);
};

export const getTestChatMessages = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentChatMessagesResponse> => {
	return await makeRestApiRequest<AgentChatMessagesResponse>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/chat/messages`,
	);
};

export const clearTestChatMessages = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<void> => {
	await makeRestApiRequest(
		context,
		'DELETE',
		`/projects/${projectId}/agents/v2/${agentId}/chat/messages`,
	);
};

export const deleteCustomTool = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	toolId: string,
): Promise<void> => {
	await makeRestApiRequest(
		context,
		'DELETE',
		`/projects/${projectId}/agents/v2/${agentId}/tools/${toolId}`,
	);
};

export const listAgentIntegrations = async (
	context: IRestApiContext,
	projectId: string,
): Promise<ChatIntegrationDescriptor[]> => {
	return await makeRestApiRequest<ChatIntegrationDescriptor[]>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/catalog/integrations`,
	);
};
