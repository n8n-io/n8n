import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import type {
	Preference,
	PreferenceCountResponse,
	PreferenceListQuery,
	PreferenceListResponse,
	PreferencePayload,
} from './context.types';

const ENDPOINT = '/ai-preferences';

export async function getPreferences(
	context: IRestApiContext,
	query: PreferenceListQuery = {},
): Promise<PreferenceListResponse> {
	return await makeRestApiRequest<PreferenceListResponse>(context, 'GET', ENDPOINT, query);
}

export async function getPreferenceCount(context: IRestApiContext): Promise<number> {
	const response = await makeRestApiRequest<PreferenceCountResponse>(
		context,
		'GET',
		`${ENDPOINT}/count`,
	);
	return response.count;
}

export async function createPreference(
	context: IRestApiContext,
	payload: PreferencePayload,
): Promise<Preference> {
	return await makeRestApiRequest<Preference>(context, 'POST', ENDPOINT, payload);
}

export async function updatePreference(
	context: IRestApiContext,
	id: string,
	payload: PreferencePayload,
): Promise<Preference> {
	return await makeRestApiRequest<Preference>(context, 'PATCH', `${ENDPOINT}/${id}`, payload);
}

export async function deletePreference(context: IRestApiContext, id: string): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `${ENDPOINT}/${id}`);
}
