import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { apiRequest } from '../transport';

export async function modelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = (await apiRequest.call(this, 'GET', '/api/tags')) as {
		models: Array<{ name: string }>;
	};

	let models = response.models;

	if (filter) {
		models = models.filter((model) => model.name.toLowerCase().includes(filter.toLowerCase()));
	}

	return {
		results: models.map((model) => ({ name: model.name, value: model.name })),
	};
}
