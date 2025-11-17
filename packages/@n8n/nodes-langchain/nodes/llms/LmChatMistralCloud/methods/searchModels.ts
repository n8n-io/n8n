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
	let results: INodeListSearchItems[] = [];

	// Filter out embedding models
	const chatModels = models.filter((model) => !model.id.includes('embed'));

	if (filter) {
		for (const model of chatModels) {
			if (model.id.toLowerCase().includes(filter.toLowerCase())) {
				results.push({
					name: model.id,
					value: model.id,
					metadata: loadModelMetadata('mistral', model.id),
				});
			}
		}
	} else {
		results = chatModels.map((model) => ({
			name: model.id,
			value: model.id,
			metadata: loadModelMetadata('mistral', model.id),
		}));
	}

	// Sort models alphabetically
	results = results.sort((a, b) => {
		return a.name.localeCompare(b.name);
	});

	return {
		results,
	};
}
