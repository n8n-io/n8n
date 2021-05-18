import { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from './helpers';

export async function getNewWorkflow(context: IRestApiContext, { name, offset }: { name: string, offset: number }) {
	return await makeRestApiRequest(context, 'GET', `/workflows/new`, { name, offset });
}