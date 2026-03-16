import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	InstanceAiSettingsResponse,
	InstanceAiSettingsUpdateRequest,
	InstanceAiModelCredential,
} from '@n8n/api-types';

export async function fetchSettings(context: IRestApiContext): Promise<InstanceAiSettingsResponse> {
	return await makeRestApiRequest(context, 'GET', '/instance-ai/settings');
}

export async function updateSettings(
	context: IRestApiContext,
	body: InstanceAiSettingsUpdateRequest,
): Promise<InstanceAiSettingsResponse> {
	return await makeRestApiRequest(context, 'PUT', '/instance-ai/settings', body);
}

export async function fetchModelCredentials(
	context: IRestApiContext,
): Promise<InstanceAiModelCredential[]> {
	return await makeRestApiRequest(context, 'GET', '/instance-ai/settings/credentials');
}
