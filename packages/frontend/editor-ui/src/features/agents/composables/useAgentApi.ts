import type {
	AgentCapabilitySummary,
	AgentChatMessagesResponse,
	AgentConfigValidationResponse,
	AgentDisconnectIntegrationResponse,
	AgentFileDto,
	AgentIntegrationConnectResponse,
	AgentIntegrationStatusResponse,
	AgentJsonVectorStoreConfig,
	AgentSkill,
	AgentSkillMutationResponse,
	AgentTaskConfig,
	AgentTaskDto,
	AgentIntegrationSettings,
	AgentCatalogModel,
	AgentProviderModelsResponse,
	AgentVersionListItemDto,
	ChatIntegrationDescriptor,
	VectorStoreTestResult,
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
		availableInMCP?: boolean;
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
	/** Creates the agent under an already-minted id, so a surface that referenced
	 *  it while unsaved keeps pointing at the same agent. */
	options: { id?: string } = {},
): Promise<AgentResource> => {
	return await makeRestApiRequest<AgentResource>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2`,
		{ name, ...(options.id ? { id: options.id } : {}) },
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

/** `replaces` swaps a same-type channel in the same request instead of a follow-up disconnect. */
export interface ConnectIntegrationOptions {
	replaces?: { credentialId: string };
}

export const connectIntegration = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	type: string,
	credentialId: string,
	settings?: AgentIntegrationSettings,
	options?: ConnectIntegrationOptions,
): Promise<AgentIntegrationConnectResponse> => {
	return await makeRestApiRequest<AgentIntegrationConnectResponse>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/integrations/connect`,
		{
			type,
			credentialId,
			...(settings ? { settings } : {}),
			...(options?.replaces ? { replaces: options.replaces } : {}),
		},
	);
};

export const disconnectIntegration = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	type: string,
	credentialId: string,
	deleteExternalResource?: boolean,
): Promise<AgentDisconnectIntegrationResponse> => {
	return await makeRestApiRequest<AgentDisconnectIntegrationResponse>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/integrations/disconnect`,
		{ type, credentialId, deleteExternalResource },
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

export type ModelInfo = AgentCatalogModel;

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

export const getProviderModels = async (
	context: IRestApiContext,
	projectId: string,
	provider: string,
	credentialId?: string,
): Promise<AgentProviderModelsResponse> => {
	return await makeRestApiRequest<AgentProviderModelsResponse>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/catalog/models/${provider}`,
		credentialId ? { credentialId } : undefined,
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

/**
 * Static, authoritative readiness check for the current draft. Never
 * performs live/network validation — safe to call frequently. The publish
 * endpoint re-checks this independently, so this is purely for UI feedback
 * (disabled Publish tooltip, invalid capability chips).
 */
export const getAgentConfigValidation = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentConfigValidationResponse> => {
	return await makeRestApiRequest<AgentConfigValidationResponse>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/validation`,
	);
};

export const getAgentCapabilitySummary = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentCapabilitySummary> => {
	return await makeRestApiRequest<AgentCapabilitySummary>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/summary`,
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

export const getChatMessages = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	threadId: string,
): Promise<AgentChatMessagesResponse> => {
	return await makeRestApiRequest<AgentChatMessagesResponse>(
		context,
		'GET',
		`/projects/${encodeURIComponent(projectId)}/agents/v2/${encodeURIComponent(agentId)}/chat/${encodeURIComponent(threadId)}/messages`,
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

export const cancelAgentChatRun = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	runId: string,
): Promise<{ cancelled: boolean }> => {
	return await makeRestApiRequest<{ cancelled: boolean }>(
		context,
		'DELETE',
		`/projects/${projectId}/agents/v2/${agentId}/chat/runs/${runId}`,
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

export const testAgentVectorStore = async (
	context: IRestApiContext,
	projectId: string,
	vectorStore: AgentJsonVectorStoreConfig,
): Promise<VectorStoreTestResult> => {
	return await makeRestApiRequest<VectorStoreTestResult>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/vector-stores/test`,
		{ vectorStore },
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
