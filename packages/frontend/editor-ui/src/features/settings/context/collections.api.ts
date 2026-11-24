import type {
	CreateKnowledgeCollectionDto,
	KnowledgeCollectionAgentDto,
	KnowledgeCollectionDto,
	KnowledgeCollectionFileDto,
	KnowledgeCollectionFileListResponse,
	KnowledgeCollectionListResponse,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

/** The collections of every project where the user can read agents, newest first. */
export async function fetchCollections(
	context: IRestApiContext,
): Promise<KnowledgeCollectionListResponse> {
	return await makeRestApiRequest<KnowledgeCollectionListResponse>(
		context,
		'GET',
		'/knowledge/collections',
	);
}

export async function createCollection(
	context: IRestApiContext,
	projectId: string,
	payload: CreateKnowledgeCollectionDto,
): Promise<KnowledgeCollectionDto> {
	return await makeRestApiRequest<KnowledgeCollectionDto>(
		context,
		'POST',
		`/projects/${projectId}/knowledge/collections`,
		payload,
	);
}

export async function getCollection(
	context: IRestApiContext,
	projectId: string,
	collectionId: string,
): Promise<KnowledgeCollectionDto> {
	return await makeRestApiRequest<KnowledgeCollectionDto>(
		context,
		'GET',
		`/projects/${projectId}/knowledge/collections/${collectionId}`,
	);
}

export async function listCollectionFiles(
	context: IRestApiContext,
	projectId: string,
	collectionId: string,
): Promise<KnowledgeCollectionFileListResponse> {
	return await makeRestApiRequest<KnowledgeCollectionFileListResponse>(
		context,
		'GET',
		`/projects/${projectId}/knowledge/collections/${collectionId}/files`,
	);
}

export async function uploadCollectionFiles(
	context: IRestApiContext,
	projectId: string,
	collectionId: string,
	files: File[],
): Promise<KnowledgeCollectionFileDto[]> {
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
}

export async function deleteCollectionFile(
	context: IRestApiContext,
	projectId: string,
	collectionId: string,
	fileId: string,
): Promise<void> {
	await makeRestApiRequest(
		context,
		'DELETE',
		`/projects/${projectId}/knowledge/collections/${collectionId}/files/${fileId}`,
	);
}

export async function listCollectionAgents(
	context: IRestApiContext,
	projectId: string,
	collectionId: string,
): Promise<KnowledgeCollectionAgentDto[]> {
	return await makeRestApiRequest<KnowledgeCollectionAgentDto[]>(
		context,
		'GET',
		`/projects/${projectId}/knowledge/collections/${collectionId}/agents`,
	);
}
