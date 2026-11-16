import type {
	AiPreferenceCountDto,
	AiPreferenceListDto,
	AiPreferenceRequestDto,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import type { Preference, PreferenceListQuery } from './context.types';

const ENDPOINT = '/ai-preferences';

export async function getPreferences(
	context: IRestApiContext,
	{ ids, ...query }: PreferenceListQuery = {},
): Promise<AiPreferenceListDto> {
	return await makeRestApiRequest<AiPreferenceListDto>(context, 'GET', ENDPOINT, {
		...query,
		...(ids ? { ids: ids.join(',') } : {}),
	});
}

export async function getPreferenceCount(context: IRestApiContext): Promise<number> {
	const response = await makeRestApiRequest<AiPreferenceCountDto>(
		context,
		'GET',
		`${ENDPOINT}/count`,
	);
	return response.count;
}

export async function createPreference(
	context: IRestApiContext,
	payload: AiPreferenceRequestDto,
): Promise<Preference> {
	return await makeRestApiRequest<Preference>(context, 'POST', ENDPOINT, payload);
}

export async function updatePreference(
	context: IRestApiContext,
	id: string,
	payload: AiPreferenceRequestDto,
): Promise<Preference> {
	return await makeRestApiRequest<Preference>(context, 'PATCH', `${ENDPOINT}/${id}`, payload);
}

export async function deletePreference(context: IRestApiContext, id: string): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `${ENDPOINT}/${id}`);
}
