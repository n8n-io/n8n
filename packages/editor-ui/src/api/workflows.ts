import { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from './helpers';

export async function getNewWorkflow(context: IRestApiContext, name?: string) {
	return await makeRestApiRequest(context, 'GET', `/workflows/new`, name ? { name } : {});
}

