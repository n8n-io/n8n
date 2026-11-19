import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

export const EMBEDDING_MODELS: INodeListSearchItems[] = [
	{
		name: 'Embed-English-Light-v2.0 (1024 Dimensions)',
		value: 'embed-english-light-v2.0',
	},
	{
		name: 'Embed-English-Light-v3.0 (384 Dimensions)',
		value: 'embed-english-light-v3.0',
	},
	{
		name: 'Embed-English-v2.0 (4096 Dimensions)',
		value: 'embed-english-v2.0',
	},
	{
		name: 'Embed-English-v3.0 (1024 Dimensions)',
		value: 'embed-english-v3.0',
	},
	{
		name: 'Embed-Multilingual-Light-v3.0 (384 Dimensions)',
		value: 'embed-multilingual-light-v3.0',
	},
	{
		name: 'Embed-Multilingual-v2.0 (768 Dimensions)',
		value: 'embed-multilingual-v2.0',
	},
	{
		name: 'Embed-Multilingual-v3.0 (1024 Dimensions)',
		value: 'embed-multilingual-v3.0',
	},
	{
		name: 'Embed-v4.0',
		value: 'embed-v4.0',
	},
];

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const search = filter?.toLowerCase();
	const results = EMBEDDING_MODELS.filter(
		(model) =>
			!search ||
			model.name.toLowerCase().includes(search) ||
			String(model.value).toLowerCase().includes(search),
	);
	return { results };
}
