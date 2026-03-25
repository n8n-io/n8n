import type { ListCliSessionsResponseDto, DeleteCliSessionResponseDto } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function fetchCliSessions(
	context: IRestApiContext,
): Promise<ListCliSessionsResponseDto> {
	return await makeRestApiRequest(context, 'GET', '/oauth/sessions');
}

export async function revokeCliSession(
	context: IRestApiContext,
	sessionId: string,
): Promise<DeleteCliSessionResponseDto> {
	return await makeRestApiRequest(
		context,
		'DELETE',
		`/oauth/sessions/${encodeURIComponent(sessionId)}`,
	);
}
