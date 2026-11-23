import type { CreateKnowledgeCollectionDto, KnowledgeCollectionDto } from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

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
