import type {
	AgentBuilderMessagesResponse,
	AgentPersistedMessageDto,
	ChatIntegrationDescriptor,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { AgentResource, AgentJsonConfig } from '../types';

export const listAgents = async (
	context: IRestApiContext,
	projectId: string,
): Promise<AgentResource[]> => {
	return await makeRestApiRequest<AgentResource[]>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2`,
	);
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

export const updateAgent = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	data: { code?: string; name?: string },
): Promise<AgentResource> => {
	return await makeRestApiRequest<AgentResource>(
		context,
		'PATCH',
		`/projects/${projectId}/agents/v2/${agentId}`,
		data,
	);
};

export const deleteAgent = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<void> => {
	await makeRestApiRequest(context, 'DELETE', `/projects/${projectId}/agents/v2/${agentId}`);
};

export const connectIntegration = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	type: string,
	credentialId: string,
): Promise<{ status: string }> => {
	return await makeRestApiRequest(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/integrations/connect`,
		{ type, credentialId },
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
): Promise<{ status: string; integrations?: Array<{ type: string; credentialId: string }> }> => {
	return await makeRestApiRequest(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/integrations/status`,
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

export const listAllAgents = async (
	context: IRestApiContext,
	projectId: string,
): Promise<AgentResource[]> => {
	return await makeRestApiRequest<AgentResource[]>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2?all=true`,
	);
};

export interface ModelInfo {
	id: string;
	name: string;
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
): Promise<AgentResource> => {
	return await makeRestApiRequest<AgentResource>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/publish`,
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

export const listAgentCredentials = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<Array<{ id: string; name: string; type: string }>> => {
	return await makeRestApiRequest<Array<{ id: string; name: string; type: string }>>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/credentials`,
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
): Promise<AgentPersistedMessageDto[]> => {
	return await makeRestApiRequest<AgentPersistedMessageDto[]>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/chat/${threadId}/messages`,
	);
};

export const getTestChatMessages = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentPersistedMessageDto[]> => {
	return await makeRestApiRequest<AgentPersistedMessageDto[]>(
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
