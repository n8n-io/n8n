import type {
	CreateKnowledgeCollectionDto,
	KnowledgeCollectionDto,
	KnowledgeCollectionListResponse,
	UpdateKnowledgeCollectionDto,
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

/** A field that is not in the payload keeps its current value. */
export async function updateCollection(
	context: IRestApiContext,
	projectId: string,
	collectionId: string,
	payload: UpdateKnowledgeCollectionDto,
): Promise<KnowledgeCollectionDto> {
	return await makeRestApiRequest<KnowledgeCollectionDto>(
		context,
		'PATCH',
		`/projects/${projectId}/knowledge/collections/${collectionId}`,
		payload,
	);
}

export async function deleteCollection(
	context: IRestApiContext,
	projectId: string,
	collectionId: string,
): Promise<{ success: true }> {
	return await makeRestApiRequest<{ success: true }>(
		context,
		'DELETE',
		`/projects/${projectId}/knowledge/collections/${collectionId}`,
	);
}
