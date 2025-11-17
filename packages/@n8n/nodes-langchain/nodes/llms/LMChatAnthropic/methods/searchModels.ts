import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { loadModelMetadata } from '@utils/modelMetadataLoader';

export interface AnthropicModel {
	id: string;
	display_name: string;
	type: string;
	created_at: string;
}

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials<{ url?: string }>('anthropicApi');

	const baseURL = credentials.url ?? 'https://api.anthropic.com';
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'anthropicApi', {
		url: `${baseURL}/v1/models`,
		headers: {
			'anthropic-version': '2023-06-01',
		},
	})) as { data: AnthropicModel[] };

	const models = response.data || [];
	let filteredModels = filter
		? models.filter((model) => model.id.toLowerCase().includes(filter.toLowerCase()))
		: models;

	// Load metadata for all models in parallel
	const metadataResults = await Promise.all(
		filteredModels.map(async (model) => await loadModelMetadata('anthropic', model.id)),
	);

	// Combine models with their metadata
	let results: INodeListSearchItems[] = filteredModels.map((model, idx) => ({
		name: model.display_name,
		value: model.id,
		metadata: metadataResults[idx],
	}));

	// Sort models with more recent ones first (claude-3 before claude-2)
	results = results.sort((a, b) => {
		const modelA = models.find((m) => m.id === a.value);
		const modelB = models.find((m) => m.id === b.value);

		if (!modelA || !modelB) return 0;

		// Sort by created_at date, most recent first
		const dateA = new Date(modelA.created_at);
		const dateB = new Date(modelB.created_at);
		return dateB.getTime() - dateA.getTime();
	});

	return {
		results,
	};
}
