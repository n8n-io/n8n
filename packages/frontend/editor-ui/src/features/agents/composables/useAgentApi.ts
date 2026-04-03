import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { AgentSchema } from '../types';

export interface AgentDto {
	id: string;
	name: string;
	code: string;
	description: string | null;
	projectId: string;
	credentialId: string | null;
	provider: string | null;
	model: string | null;
	isCompiled: boolean;
	createdAt: string;
	updatedAt: string;
}

export const listAgents = async (
	context: IRestApiContext,
	projectId: string,
): Promise<AgentDto[]> => {
	return await makeRestApiRequest<AgentDto[]>(context, 'GET', `/projects/${projectId}/agents/v2`);
};

export const getAgent = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentDto> => {
	return await makeRestApiRequest<AgentDto>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}`,
	);
};

export const createAgent = async (
	context: IRestApiContext,
	projectId: string,
	name: string,
): Promise<AgentDto> => {
	return await makeRestApiRequest<AgentDto>(context, 'POST', `/projects/${projectId}/agents/v2`, {
		name,
	});
};

export const updateAgent = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	data: { code?: string; name?: string },
): Promise<AgentDto> => {
	return await makeRestApiRequest<AgentDto>(
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

export const connectSlack = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	credentialId: string,
): Promise<{ status: string }> => {
	return await makeRestApiRequest(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/integrations/connect`,
		{ type: 'slack', credentialId },
	);
};

export const disconnectSlack = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	credentialId: string,
): Promise<{ status: string }> => {
	return await makeRestApiRequest(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/integrations/disconnect`,
		{ type: 'slack', credentialId },
	);
};

export const getSlackStatus = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<{ status: string }> => {
	return await makeRestApiRequest(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/integrations/status`,
	);
};

export const listAllAgents = async (
	context: IRestApiContext,
	projectId: string,
): Promise<AgentDto[]> => {
	return await makeRestApiRequest<AgentDto[]>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2?all=true`,
	);
};

export const getAgentSchema = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentSchema> => {
	return await makeRestApiRequest<AgentSchema>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/schema`,
	);
};

export const patchAgentSchema = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	schema: AgentSchema,
	updatedAt: string,
): Promise<{ code: string; schema: AgentSchema; updatedAt: string }> => {
	return await makeRestApiRequest<{ code: string; schema: AgentSchema; updatedAt: string }>(
		context,
		'PATCH',
		`/projects/${projectId}/agents/v2/${agentId}/schema`,
		{ schema, updatedAt },
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
