import { IRestApiContext, ITag } from '@/Interface';
import { makeRestApiRequest } from '@/utils';

export async function getTags(context: IRestApiContext, withUsageCount = false): Promise<ITag[]> {
	return await makeRestApiRequest(context, 'GET', '/tags', { withUsageCount });
}

export async function createTag(context: IRestApiContext, params: { name: string }): Promise<ITag> {
	return await makeRestApiRequest(context, 'POST', '/tags', params);
}

export async function updateTag(context: IRestApiContext, id: string, params: { name: string }): Promise<ITag> {
	return await makeRestApiRequest(context, 'PATCH', `/tags/${id}`, params);
}

export async function deleteTag(context: IRestApiContext, id: string): Promise<boolean> {
	return await makeRestApiRequest(context, 'DELETE', `/tags/${id}`);
}
