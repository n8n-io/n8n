import type {
	CreateKnowledgeCollectionDto,
	KnowledgeCollectionDto,
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
