import type { LoginSessionList, RevokeAllOtherSessionsResponse } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function getLoginSessions(context: IRestApiContext): Promise<LoginSessionList> {
	return await makeRestApiRequest(context, 'GET', '/me/login-sessions');
}

export async function revokeLoginSession(
	context: IRestApiContext,
	id: string,
): Promise<{ success: true }> {
	return await makeRestApiRequest(context, 'DELETE', `/me/login-sessions/${id}`);
}

export async function revokeAllOtherLoginSessions(
	context: IRestApiContext,
): Promise<RevokeAllOtherSessionsResponse> {
	return await makeRestApiRequest(context, 'POST', '/me/login-sessions/revoke-all-others');
}
