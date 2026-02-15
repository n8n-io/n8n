import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import type { ICredentialsResponse } from '../credentials.types';

export async function createQuickConnectCredential(
	context: IRestApiContext,
	payload: { credentialType: string; projectId?: string },
): Promise<ICredentialsResponse> {
	return await makeRestApiRequest(context, 'POST', '/quick-connect/create', payload);
}
