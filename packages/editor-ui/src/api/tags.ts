import { IRootState, ITag, ITagsState } from '@/Interface';
import { ActionContext } from 'vuex';
import makeRestApiRequest from './helpers';

export async function getTags(context: ActionContext<ITagsState, IRootState>, withUsageCount = false): Promise<ITag[]> {
	return await makeRestApiRequest(context, 'GET', '/tags', {withUsageCount});
}

export async function addTag(context: ActionContext<ITagsState, IRootState>, params: { name: string }): Promise<ITag> {
	return await makeRestApiRequest(context, 'POST', '/tags', params);
}

export async function updateTag(context: ActionContext<ITagsState, IRootState>, id: string, params: { name: string }) {
	return await makeRestApiRequest(context, 'PATCH', `/tags/${id}`, params);
}

export async function deleteTag(context: ActionContext<ITagsState, IRootState>, id: string) {
	return await makeRestApiRequest(context, 'DELETE', `/tags/${id}`);
}
