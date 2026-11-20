import type { ScimConfigResponse } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

/** Response of `POST /rest/scim/token`. This is the only response that contains the full token. */
export type ScimTokenResponse = {
	token: string;
	baseUrl: string;
};

export async function getScimConfig(context: IRestApiContext): Promise<ScimConfigResponse> {
	return await makeRestApiRequest(context, 'GET', '/scim/config');
}

export async function setScimEnabled(
	context: IRestApiContext,
	enabled: boolean,
): Promise<{ enabled: boolean }> {
	return await makeRestApiRequest(context, 'PATCH', '/scim/config', { enabled });
}

/** Creates the instance token. A new token replaces the old one, and the old one stops working. */
export async function generateScimToken(context: IRestApiContext): Promise<ScimTokenResponse> {
	return await makeRestApiRequest(context, 'POST', '/scim/token');
}
