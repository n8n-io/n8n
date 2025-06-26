import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { apiRequest } from '../transport';

async function baseModelSearch(
	this: ILoadOptionsFunctions,
	modelFilter: (model: string) => boolean,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = (await apiRequest.call(this, 'GET', '/v1beta/models', {
		qs: {
			pageSize: 1000,
		},
	})) as {
		models: Array<{ name: string }>;
	};

	let models = response.models.filter((model) => modelFilter(model.name));
	if (filter) {
		models = models.filter((model) => model.name.toLowerCase().includes(filter.toLowerCase()));
	}

	return {
		results: models.map((model) => ({ name: model.name, value: model.name })),
	};
}

export async function modelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return await baseModelSearch.call(
		this,
		// TODO: double check this
		(model) =>
			!model.includes('embedding') &&
			!model.includes('image') &&
			!model.includes('veo') &&
			!model.includes('audio'),
		filter,
	);
}

// TODO: models for audio, image, video and document processing
