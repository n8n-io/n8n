import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import type { OllamaTagsResponse } from '../helpers/interfaces';
import { apiRequest } from '../transport';

export async function modelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response: OllamaTagsResponse = await apiRequest.call(this, 'GET', '/api/tags');

	let models = response.models;

	if (filter) {
		models = models.filter((model) => model.name.toLowerCase().includes(filter.toLowerCase()));
	}

	return {
		results: models.map((model) => ({ name: model.name, value: model.name })),
	};
}
