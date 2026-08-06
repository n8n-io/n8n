import type { TrustedKeySource, TrustedKeySourcePolicy } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function getTrustedKeySources(context: IRestApiContext): Promise<TrustedKeySource[]> {
	return await makeRestApiRequest(context, 'GET', '/trusted-key-sources');
}

/**
 * Replaces the source's admin policy. Omitting a field clears that override —
 * absent already means "use the value derived from discovery or env config".
 */
export async function updateTrustedKeySourcePolicy(
	context: IRestApiContext,
	id: string,
	policy: TrustedKeySourcePolicy,
): Promise<TrustedKeySource> {
	return await makeRestApiRequest(context, 'PATCH', `/trusted-key-sources/${id}`, { policy });
}
