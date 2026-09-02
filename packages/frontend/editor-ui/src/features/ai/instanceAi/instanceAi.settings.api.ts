import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	InstanceAiAdminSettingsResponse,
	InstanceAiAdminSettingsUpdateRequest,
	InstanceAiUserPreferencesResponse,
	InstanceAiUserPreferencesUpdateRequest,
	InstanceAiProviderConnection,
	InstanceAiVerificationResponse,
	InstanceAiVerifyModelRequest,
	InstanceAiVerifySandboxRequest,
	InstanceAiVerifySearchRequest,
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

export async function fetchServiceCredentials(
	context: IRestApiContext,
): Promise<InstanceAiProviderConnection[]> {
	return await makeRestApiRequest(context, 'GET', '/instance-ai/settings/service-credentials');
}

export async function fetchInstanceModelCredentials(
	context: IRestApiContext,
): Promise<InstanceAiProviderConnection[]> {
	return await makeRestApiRequest(context, 'GET', '/instance-ai/settings/model-credentials');
}

export async function verifyModel(
	context: IRestApiContext,
	body: InstanceAiVerifyModelRequest,
): Promise<InstanceAiVerificationResponse> {
	return await makeRestApiRequest(context, 'POST', '/instance-ai/settings/verify/model', body);
}

export async function verifySandbox(
	context: IRestApiContext,
	body: InstanceAiVerifySandboxRequest,
): Promise<InstanceAiVerificationResponse> {
	return await makeRestApiRequest(context, 'POST', '/instance-ai/settings/verify/sandbox', body);
}

export async function verifySearch(
	context: IRestApiContext,
	body: InstanceAiVerifySearchRequest,
): Promise<InstanceAiVerificationResponse> {
	return await makeRestApiRequest(context, 'POST', '/instance-ai/settings/verify/search', body);
}
