import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

export async function sessionStarted(context: IRestApiContext): Promise<void> {
	return await makeRestApiRequest(context, 'GET', '/events/session-started');
}
