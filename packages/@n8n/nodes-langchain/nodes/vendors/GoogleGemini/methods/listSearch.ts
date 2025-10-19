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
		(model) =>
			!model.includes('embedding') &&
			!model.includes('aqa') &&
			!model.includes('image') &&
			!model.includes('vision') &&
			!model.includes('veo') &&
			!model.includes('audio') &&
			!model.includes('tts'),
		filter,
	);
}

export async function audioModelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return await baseModelSearch.call(
		this,
		(model) =>
			!model.includes('embedding') &&
			!model.includes('aqa') &&
			!model.includes('image') &&
			!model.includes('vision') &&
			!model.includes('veo') &&
			!model.includes('tts'), // we don't have a tts operation
		filter,
	);
}

export async function imageGenerationModelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const results = await baseModelSearch.call(
		this,
		(model) =>
			model.includes('imagen') ||
			model.includes('image-generation') ||
			model.includes('flash-image'),
		filter,
	);

	return {
		results: results.results.map((r) =>
			r.name.includes('gemini-2.5-flash-image')
				? { name: `${r.name} (Nano Banana)`, value: r.value }
				: r,
		),
	};
}

export async function videoGenerationModelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return await baseModelSearch.call(this, (model) => model.includes('veo'), filter);
}
