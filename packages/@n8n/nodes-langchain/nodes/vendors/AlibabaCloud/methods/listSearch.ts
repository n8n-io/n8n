import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { apiRequest } from '../transport';

type DashScopeModel = { model?: string; model_name?: string; id?: string; name?: string };

const PAGE_SIZE = 100;

function extractModelId(item: DashScopeModel | string): string | undefined {
	if (typeof item === 'string') return item;
	return item.model ?? item.model_name ?? item.id;
}

async function baseModelSearch(
	this: ILoadOptionsFunctions,
	modelFilter: (model: string) => boolean,
	filter?: string,
): Promise<INodeListSearchResult> {
	const allIds: string[] = [];

	for (let page = 1; ; page++) {
		const response = await apiRequest.call(this, 'GET', '/api/v1/models', {
			qs: { page_no: page, page_size: PAGE_SIZE },
		});

		const output = (response?.output ?? response) as Record<string, unknown>;
		const items = (output?.models ?? output?.data ?? output?.list ?? output?.items ?? []) as
			| DashScopeModel[]
			| string[];

		if (!items.length) break;

		for (const item of items) {
			const id = extractModelId(item);
			if (id) allIds.push(id);
		}

		if (items.length < PAGE_SIZE) break;
	}

	let models = allIds.filter((id) => modelFilter(id));

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
