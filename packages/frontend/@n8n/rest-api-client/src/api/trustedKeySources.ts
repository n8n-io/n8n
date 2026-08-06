import type { TrustedKeySource } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function getTrustedKeySources(context: IRestApiContext): Promise<TrustedKeySource[]> {
	return await makeRestApiRequest(context, 'GET', '/trusted-key-sources');
}
