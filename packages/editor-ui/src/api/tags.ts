import type { IRestApiContext, ITag } from '@/Interface';
import { makeRestApiRequest } from '@/utils';

export async function getTags(context: IRestApiContext, withUsageCount = false): Promise<ITag[]> {
	return makeRestApiRequest(context, 'GET', '/tags', { withUsageCount });
}

export async function createTag(context: IRestApiContext, params: { name: string }): Promise<ITag> {
	return makeRestApiRequest(context, 'POST', '/tags', params);
}

export async function updateTag(
	context: IRestApiContext,
	id: string,
	params: { name: string },
): Promise<ITag> {
	return makeRestApiRequest(context, 'PATCH', `/tags/${id}`, params);
}

export async function deleteTag(context: IRestApiContext, id: string): Promise<boolean> {
	return makeRestApiRequest(context, 'DELETE', `/tags/${id}`);
}
