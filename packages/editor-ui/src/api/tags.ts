import { ITag } from '@/Interface';
import { ActionContext } from 'vuex';
import makeRestApiRequest from './helpers';

export async function getTags(context: ActionContext<any, unknown>): Promise<ITag[]> {
    return await makeRestApiRequest(context, 'GET', '/tags');
};

export async function addTag(context: ActionContext<any, unknown>, params: {name: string}) {
    return await makeRestApiRequest(context, 'POST', '/tags') 
}

export async function updateTag(context: ActionContext<any, unknown>, id: number, params: {name: string}) {
    return await makeRestApiRequest(context, 'PATCH', `/tags/${id}`);
}

export async function deleteTag(context: ActionContext<any, unknown>, id: number) {
    return await makeRestApiRequest(context, 'DELETE', `/tags/${id}`);
}
