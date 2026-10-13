import { getGoogleModelLabel, pinGoogleModels } from '@n8n/ai-utilities/model-discovery';
import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { apiRequest } from '../transport';

/** Nano Banana ids do not contain the word "image". */
function isImageModel(model: string): boolean {
	return model.includes('image') || model.includes('nano-banana');
}

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
		models: Array<{ name: string; displayName?: string }>;
	};

	let results = response.models
		.filter((model) => modelFilter(model.name))
		.map((model) => ({
			name: getGoogleModelLabel(model.name, model.displayName),
			value: model.name,
		}));
	if (filter) {
		const query = filter.toLowerCase();
		results = results.filter(
			(result) =>
				result.name.toLowerCase().includes(query) || result.value.toLowerCase().includes(query),
		);
	}

	results.sort((a, b) => a.name.localeCompare(b.name));
	return { results: pinGoogleModels(results, (result) => result.value) };
}

export async function modelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return await baseModelSearch.call(
		this,
		(model) =>
			!isImageModel(model) &&
			!model.includes('embedding') &&
			!model.includes('aqa') &&
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
			!isImageModel(model) &&
			!model.includes('embedding') &&
			!model.includes('aqa') &&
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
	const rawResult = await baseModelSearch.call(this, isImageModel);
	let results = rawResult.results.map((r) => {
		const modelId = String(r.value);
		if (modelId.includes('gemini-nano-banana-2.1')) {
			return { name: `${r.name} (Nano Banana 2.1)`, value: r.value };
		}

		// The Lite id also contains "gemini-3.1-flash-image". Match it first.
		if (modelId.includes('gemini-3.1-flash-lite-image')) {
			return { name: `${r.name} (Nano Banana 2 Lite)`, value: r.value };
		}

		if (modelId.includes('gemini-3.1-flash-image')) {
			return { name: `${r.name} (Nano Banana 2)`, value: r.value };
		}

		if (modelId.includes('gemini-2.5-flash-image')) {
			return { name: `${r.name} (Nano Banana)`, value: r.value };
		}

		if (modelId.includes('gemini-3-pro-image')) {
			return { name: `${r.name} (Nano Banana Pro)`, value: r.value };
		}

		return r;
	});

	if (filter) {
		const filterLowerCase = filter.toLowerCase();
		results = results.filter((r) => r.name.toLowerCase().includes(filterLowerCase));
	}

	return {
		results,
	};
}

export async function imageEditModelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const result = await imageGenerationModelSearch.call(this, filter);
	return {
		results: result.results.filter((r) => r.name.toLowerCase().includes('nano banana')),
	};
}

export async function videoGenerationModelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return await baseModelSearch.call(this, (model) => model.includes('veo'), filter);
}
