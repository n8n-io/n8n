import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	InstanceAiAdminSettingsResponse,
	InstanceAiAdminSettingsUpdateRequest,
	InstanceAiUserPreferencesResponse,
	InstanceAiUserPreferencesUpdateRequest,
	InstanceAiModelCredential,
} from '@n8n/api-types';

export async function fetchSettings(
	context: IRestApiContext,
): Promise<InstanceAiAdminSettingsResponse> {
	return await makeRestApiRequest(context, 'GET', '/instance-ai/settings');
}

export async function updateSettings(
	context: IRestApiContext,
	body: InstanceAiAdminSettingsUpdateRequest,
): Promise<InstanceAiAdminSettingsResponse> {
	return await makeRestApiRequest(context, 'PUT', '/instance-ai/settings', body);
}

export async function fetchPreferences(
	context: IRestApiContext,
): Promise<InstanceAiUserPreferencesResponse> {
	return await makeRestApiRequest(context, 'GET', '/instance-ai/preferences');
}

export async function updatePreferences(
	context: IRestApiContext,
	body: InstanceAiUserPreferencesUpdateRequest,
): Promise<InstanceAiUserPreferencesResponse> {
	return await makeRestApiRequest(context, 'PUT', '/instance-ai/preferences', body);
}

export async function fetchModelCredentials(
	context: IRestApiContext,
): Promise<InstanceAiModelCredential[]> {
	return await makeRestApiRequest(context, 'GET', '/instance-ai/settings/credentials');
}

export async function fetchServiceCredentials(
	context: IRestApiContext,
): Promise<InstanceAiModelCredential[]> {
	return await makeRestApiRequest(context, 'GET', '/instance-ai/settings/service-credentials');
}
