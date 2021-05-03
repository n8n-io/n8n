import { IRestApiContext, ITag } from '@/Interface';
import { makeRestApiRequest } from './helpers';

export async function renameWorkflow(context: IRestApiContext, id: string, params: { name: string, tags: ITag[] }) {
	return await makeRestApiRequest(context, 'PATCH', `/workflows/${id}`, params);
}
