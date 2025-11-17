import { request } from '@n8n/rest-api-client';
import type { IModelMetadata } from 'n8n-workflow';

export type GetModelMetadataOptions = {
	provider: string;
	modelId: string;
	nodeType?: string;
};

const isValidModelMetadata = (response: unknown): response is IModelMetadata => {
	return (
		!!response &&
		typeof response === 'object' &&
		'id' in response &&
		'name' in response &&
		'provider' in response &&
		'pricing' in response &&
		'intelligenceLevel' in response
	);
};

export const getModelMetadata = async (
	baseUrl: string,
	options: GetModelMetadataOptions,
): Promise<IModelMetadata | null> => {
	const { provider, modelId, nodeType } = options;

	const queryParams = nodeType ? `?nodeType=${encodeURIComponent(nodeType)}` : '';
	const endpoint = `model-metadata/${provider}/${modelId}.json${queryParams}`;

	try {
		const response = await request({
			method: 'GET',
			baseURL: baseUrl,
			endpoint,
			withCredentials: false,
		});

		if (!isValidModelMetadata(response)) {
			console.warn(`Invalid model metadata structure for ${provider}/${modelId}`);
			return null;
		}

		return response;
	} catch (error) {
		// Metadata file not found - return null to trigger fallback
		console.debug(`No metadata file found for ${provider}/${modelId}, using fallback`);
		return null;
	}
};
