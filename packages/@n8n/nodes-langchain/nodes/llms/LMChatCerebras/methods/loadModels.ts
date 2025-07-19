import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	// Cerebras doesn't provide a models API endpoint like OpenAI
	// So we'll provide a static list of their available models
	const models = [
		{ id: 'qwen-3-235b-a22b', name: 'Qwen 3 235B' },
		{ id: 'qwen-3-32b', name: 'Qwen 3 32B' },
		{ id: 'llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B Instruct' },
		{ id: 'llama-3.3-70b', name: 'Llama 3.3 70B' },
		{ id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill Llama 70B' },
		{ id: 'llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B Instruct' },
	];

	const filteredModels = filter
		? models.filter(
				(model) =>
					model.name.toLowerCase().includes(filter.toLowerCase()) ||
					model.id.toLowerCase().includes(filter.toLowerCase()),
			)
		: models;

	return {
		results: filteredModels.map((model) => ({
			name: model.name,
			value: model.id,
		})),
	};
}
