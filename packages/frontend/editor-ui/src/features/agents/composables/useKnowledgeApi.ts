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

interface CollectionParams {
	projectId: string;
	collectionId: string;
}

/** The collection fields that the collection page shows. */
export interface KnowledgeCollectionSummary {
	id: string;
	name: string;
	description: string | null;
}

export const getCollection = async (
	context: IRestApiContext,
	{ projectId, collectionId }: CollectionParams,
): Promise<KnowledgeCollectionSummary> => {
	return await makeRestApiRequest<KnowledgeCollectionSummary>(
		context,
		'GET',
		`/projects/${projectId}/knowledge/collections/${collectionId}`,
	);
};

export const listCollectionFiles = async (
	context: IRestApiContext,
	{ projectId, collectionId }: CollectionParams,
): Promise<KnowledgeCollectionFileListResponse> => {
	return await makeRestApiRequest<KnowledgeCollectionFileListResponse>(
		context,
		'GET',
		`/projects/${projectId}/knowledge/collections/${collectionId}/files`,
	);
};

export const uploadCollectionFiles = async (
	context: IRestApiContext,
	{ projectId, collectionId, files }: CollectionParams & { files: File[] },
): Promise<KnowledgeCollectionFileDto[]> => {
	const formData = new FormData();
	for (const file of files) {
		formData.append('files', file);
	}

	return await makeRestApiRequest<KnowledgeCollectionFileDto[]>(
		context,
		'POST',
		`/projects/${projectId}/knowledge/collections/${collectionId}/files`,
		formData,
	);
};

export const deleteCollectionFile = async (
	context: IRestApiContext,
	{ projectId, collectionId, fileId }: CollectionParams & { fileId: string },
): Promise<void> => {
	await makeRestApiRequest(
		context,
		'DELETE',
		`/projects/${projectId}/knowledge/collections/${collectionId}/files/${fileId}`,
	);
};

export const listCollectionAgents = async (
	context: IRestApiContext,
	{ projectId, collectionId }: CollectionParams,
): Promise<KnowledgeCollectionAgentDto[]> => {
	return await makeRestApiRequest<KnowledgeCollectionAgentDto[]>(
		context,
		'GET',
		`/projects/${projectId}/knowledge/collections/${collectionId}/agents`,
	);
};
