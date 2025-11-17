import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { loadModelMetadata } from '@utils/modelMetadataLoader';

import { apiRequest } from '../../../vendors/GoogleGemini/transport';

export async function modelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = (await apiRequest.call(this, 'GET', '/v1beta/models', {
		qs: {
			pageSize: 1000,
		},
	})) as {
		models: Array<{ name: string }>;
	};

	// Filter out embedding models (same as the node's current filter)
	let models = response.models.filter((model) => !model.name.includes('embedding'));

	if (filter) {
		models = models.filter((model) => model.name.toLowerCase().includes(filter.toLowerCase()));
	}

	// Load metadata for all models in parallel
	const metadataResults = await Promise.all(
		models.map(async (model) => {
			const modelId = model.name.replace(/^models\//, '');
			return await loadModelMetadata('google', modelId);
		}),
	);

	return {
		results: models.map((model, idx) => {
			return {
				name: model.name,
				value: model.name,
				metadata: metadataResults[idx],
			};
		}),
	};
}
