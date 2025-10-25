import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

export interface ProviderModel {
	id: string;
	name: string;
	description?: string;
	contextLength?: number;
}

export interface ProviderModelsResponse {
	models: ProviderModel[];
}

export const fetchProviderModelsApi = async (
	context: IRestApiContext,
	provider: string,
	apiKey?: string,
): Promise<ProviderModelsResponse> => {
	const apiEndpoint = `/ai/providers/${provider}/models`;
	const queryParams = apiKey ? `?apiKey=${encodeURIComponent(apiKey)}` : '';
	return await makeRestApiRequest<ProviderModelsResponse>(
		context,
		'GET',
		`${apiEndpoint}${queryParams}`,
	);
};
