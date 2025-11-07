import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function sessionStarted(context: IRestApiContext): Promise<void> {
	return await makeRestApiRequest(context, 'GET', '/events/session-started');
}
