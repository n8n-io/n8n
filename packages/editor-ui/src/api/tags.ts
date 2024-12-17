import type { IRestApiContext, ITag } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

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
