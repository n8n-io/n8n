import type {
	AgentFileDto,
	KnowledgeCollectionAgentDto,
	KnowledgeCollectionFileDto,
	KnowledgeCollectionFileListResponse,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

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

/** The collection fields that the collection page shows. */
export interface KnowledgeCollectionSummary {
	id: string;
	name: string;
	description: string | null;
}

export const getCollection = async (
	context: IRestApiContext,
	collectionId: string,
): Promise<KnowledgeCollectionSummary> => {
	return await makeRestApiRequest<KnowledgeCollectionSummary>(
		context,
		'GET',
		`/knowledge/collections/${collectionId}`,
	);
};

export const listCollectionFiles = async (
	context: IRestApiContext,
	collectionId: string,
): Promise<KnowledgeCollectionFileListResponse> => {
	return await makeRestApiRequest<KnowledgeCollectionFileListResponse>(
		context,
		'GET',
		`/knowledge/collections/${collectionId}/files`,
	);
};

export const uploadCollectionFiles = async (
	context: IRestApiContext,
	collectionId: string,
	files: File[],
): Promise<KnowledgeCollectionFileDto[]> => {
	const formData = new FormData();
	for (const file of files) {
		formData.append('files', file);
	}

	return await makeRestApiRequest<KnowledgeCollectionFileDto[]>(
		context,
		'POST',
		`/knowledge/collections/${collectionId}/files`,
		formData,
	);
};

export const deleteCollectionFile = async (
	context: IRestApiContext,
	collectionId: string,
	fileId: string,
): Promise<void> => {
	await makeRestApiRequest(
		context,
		'DELETE',
		`/knowledge/collections/${collectionId}/files/${fileId}`,
	);
};

export const listCollectionAgents = async (
	context: IRestApiContext,
	collectionId: string,
): Promise<KnowledgeCollectionAgentDto[]> => {
	return await makeRestApiRequest<KnowledgeCollectionAgentDto[]>(
		context,
		'GET',
		`/knowledge/collections/${collectionId}/agents`,
	);
};
