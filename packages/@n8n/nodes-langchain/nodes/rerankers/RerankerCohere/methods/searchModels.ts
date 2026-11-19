import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

export const RERANK_MODELS: INodeListSearchItems[] = [
	{ name: 'rerank-v3.5', value: 'rerank-v3.5' },
	{ name: 'rerank-english-v3.0', value: 'rerank-english-v3.0' },
	{ name: 'rerank-multilingual-v3.0', value: 'rerank-multilingual-v3.0' },
	{ name: 'rerank-v4.0-pro', value: 'rerank-v4.0-pro' },
	{ name: 'rerank-v4.0-fast', value: 'rerank-v4.0-fast' },
];

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const search = filter?.toLowerCase();
	const results = RERANK_MODELS.filter(
		(model) =>
			!search ||
			model.name.toLowerCase().includes(search) ||
			String(model.value).toLowerCase().includes(search),
	);
	return { results };
}
