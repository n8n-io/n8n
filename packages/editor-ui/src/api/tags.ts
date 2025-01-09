import type { IRestApiContext, ITag } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type { CreateOrUpdateTagRequestDto, RetrieveTagQueryDto } from '@n8n/api-types';

type TagsApiEndpoint = '/tags' | '/annotation-tags';

export function createTagsApi(endpoint: TagsApiEndpoint) {
	return {
		getTags: async (context: IRestApiContext, data: RetrieveTagQueryDto): Promise<ITag[]> => {
			return await makeRestApiRequest(context, 'GET', endpoint, data);
		},
		createTag: async (
			context: IRestApiContext,
			data: CreateOrUpdateTagRequestDto,
		): Promise<ITag> => {
			return await makeRestApiRequest(context, 'POST', endpoint, data);
		},
		updateTag: async (
			context: IRestApiContext,
			id: string,
			data: CreateOrUpdateTagRequestDto,
		): Promise<ITag> => {
			return await makeRestApiRequest(context, 'PATCH', `${endpoint}/${id}`, data);
		},
		deleteTag: async (context: IRestApiContext, id: string): Promise<boolean> => {
			return await makeRestApiRequest(context, 'DELETE', `${endpoint}/${id}`);
		},
	};
}
