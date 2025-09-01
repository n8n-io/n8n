import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import OpenAI from 'openai';

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('zAiApi');
	const baseURL =
		(this.getNodeParameter('options.baseURL', '') as string) ||
		(credentials.url as string) ||
		'https://api.z.ai/api/paas/v4';

	const openai = new OpenAI({
		baseURL,
		apiKey: credentials.apiKey as string,
	});
	const { data: models = [] } = await openai.models.list();

	const filteredModels = models.filter((model: { id: string }) => {
		// Filter out TTS, embedding, image generation, and other models
		const isInvalidModel =
			model.id.startsWith('cogview') ||
			model.id.startsWith('vidu') ||
			model.id.startsWith('embedding') ||
			model.id.startsWith('char') ||
			model.id.startsWith('emohaa') ||
			model.id.startsWith('cogtts') ||
			model.id.startsWith('rerank') ||
			model.id.endsWith('voice') ||
			model.id.endsWith('realtime') ||
			model.id.endsWith('asr');

		if (!filter) return !isInvalidModel;

		return !isInvalidModel && model.id.toLowerCase().includes(filter.toLowerCase());
	});

	filteredModels.sort((a, b) => a.id.localeCompare(b.id));

	return {
		results: filteredModels.map((model: { id: string }) => ({
			name: model.id,
			value: model.id,
		})),
	};
}
