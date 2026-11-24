import type {
	PublicApiRateLimitSettings,
	PublicApiRateLimitSettingsResponse,
} from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function getPublicApiRateLimitSettings(
	context: IRestApiContext,
): Promise<PublicApiRateLimitSettingsResponse> {
	return await makeRestApiRequest(context, 'GET', '/settings/policies/rate-limits');
}

export async function updatePublicApiRateLimitSettings(
	context: IRestApiContext,
	data: PublicApiRateLimitSettings,
): Promise<PublicApiRateLimitSettingsResponse> {
	return await makeRestApiRequest(context, 'PUT', '/settings/policies/rate-limits', data);
}
