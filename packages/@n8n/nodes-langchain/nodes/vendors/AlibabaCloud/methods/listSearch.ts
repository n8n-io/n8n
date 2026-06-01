import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { apiRequest } from '../transport';

async function baseModelSearch(
	this: ILoadOptionsFunctions,
	modelFilter: (model: string) => boolean,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = await apiRequest.call(this, 'GET', '/api/v1/models', {
		qs: { page_size: 200 },
	});

	const output = response?.output ?? response;
	const items = (output?.models ?? output?.data ?? []) as Array<{ model: string }>;

	let models = items
		.filter((item) => item.model && modelFilter(item.model))
		.map((item) => item.model);

	if (filter) {
		models = models.filter((id) => id.toLowerCase().includes(filter.toLowerCase()));
	}

	return {
		results: models.map((id) => ({ name: id, value: id })),
	};
}

export async function textModelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return await baseModelSearch.call(
		this,
		(model) =>
			!model.includes('-vl-') &&
			!model.startsWith('qvq') &&
			!model.includes('-ocr') &&
			!model.includes('-image') &&
			!model.includes('-t2i') &&
			!model.includes('-t2v') &&
			!model.includes('-i2v') &&
			!model.includes('-kf2v') &&
			!model.includes('-r2v') &&
			!model.includes('-s2v') &&
			!model.includes('-videoedit') &&
			!model.includes('-animate-'),
		filter,
	);
}

export async function visionModelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return await baseModelSearch.call(
		this,
		(model) => model.includes('-vl-') || model.startsWith('qvq') || model.includes('-ocr'),
		filter,
	);
}

export async function imageGenerationModelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return await baseModelSearch.call(
		this,
		(model) => model.includes('-image') || model.includes('-t2i'),
		filter,
	);
}

export async function textToVideoModelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return await baseModelSearch.call(this, (model) => model.includes('-t2v'), filter);
}

export async function imageToVideoModelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return await baseModelSearch.call(this, (model) => model.includes('-i2v'), filter);
}
