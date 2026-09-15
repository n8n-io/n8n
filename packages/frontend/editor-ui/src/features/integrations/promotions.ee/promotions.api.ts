import type { PromotableResource } from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export async function getPromotableChanges(
	context: IRestApiContext,
	projectId: string,
): Promise<PromotableResource[]> {
	return await makeRestApiRequest(context, 'GET', `/promotions/${projectId}/changes`);
}
