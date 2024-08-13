import type { IRestApiContext, ITag } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

// export async function getTags(context: IRestApiContext, withUsageCount = false): Promise<ITag[]> {
// 	return await makeRestApiRequest(context, 'GET', '/tags', { withUsageCount });
// }
//
// export async function createTag(context: IRestApiContext, params: { name: string }): Promise<ITag> {
// 	return await makeRestApiRequest(context, 'POST', '/tags', params);
// }
//
// export async function updateTag(
// 	context: IRestApiContext,
// 	id: string,
// 	params: { name: string },
// ): Promise<ITag> {
// 	return await makeRestApiRequest(context, 'PATCH', `/tags/${id}`, params);
// }
//
// export async function deleteTag(context: IRestApiContext, id: string): Promise<boolean> {
// 	return await makeRestApiRequest(context, 'DELETE', `/tags/${id}`);
// }

type TagsApiEndpoint = '/tags' | '/annotation-tags';

export interface ITagsApi {
	getTags: (context: IRestApiContext, withUsageCount?: boolean) => Promise<ITag[]>;
	createTag: (context: IRestApiContext, params: { name: string }) => Promise<ITag>;
	updateTag: (context: IRestApiContext, id: string, params: { name: string }) => Promise<ITag>;
	deleteTag: (context: IRestApiContext, id: string) => Promise<boolean>;
}

export function createTagsApi(endpoint: TagsApiEndpoint): ITagsApi {
	return {
		getTags: async (context: IRestApiContext, withUsageCount = false): Promise<ITag[]> => {
			return await makeRestApiRequest(context, 'GET', endpoint, { withUsageCount });
		},
		createTag: async (context: IRestApiContext, params: { name: string }): Promise<ITag> => {
			return await makeRestApiRequest(context, 'POST', endpoint, params);
		},
		updateTag: async (
			context: IRestApiContext,
			id: string,
			params: { name: string },
		): Promise<ITag> => {
			return await makeRestApiRequest(context, 'PATCH', `${endpoint}/${id}`, params);
		},
		deleteTag: async (context: IRestApiContext, id: string): Promise<boolean> => {
			return await makeRestApiRequest(context, 'DELETE', `${endpoint}/${id}`);
		},
	};
}
