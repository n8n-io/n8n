import { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from './helpers';

export async function getNodeTypes(
	context: IRestApiContext,
	{ onlyLatest } = { onlyLatest: false },
) {
	return makeRestApiRequest(context, 'GET', '/node-types', { onlyLatest });
}

