import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { loadModelMetadata } from '@utils/modelMetadataLoader';

export interface MistralModel {
	id: string;
	object: string;
	created: number;
	owned_by: string;
}

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'mistralCloudApi', {
		url: 'https://api.mistral.ai/v1/models',
	})) as { data: MistralModel[] };

	const models = response.data || [];

	// Filter out embedding models
	const chatModels = models.filter((model) => !model.id.includes('embed'));

	// Apply filter if provided
	const filteredModels = filter
		? chatModels.filter((model) => model.id.toLowerCase().includes(filter.toLowerCase()))
		: chatModels;

	// Load metadata for all models in parallel
	const metadataResults = await Promise.all(
		filteredModels.map(async (model) => await loadModelMetadata('mistral', model.id)),
	);

	// Combine models with their metadata
	let results: INodeListSearchItems[] = filteredModels.map((model, idx) => ({
		name: model.id,
		value: model.id,
		metadata: metadataResults[idx],
	}));

	// Sort models alphabetically
	results = results.sort((a, b) => {
		return a.name.localeCompare(b.name);
	});

	return {
		results,
	};
}
