import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import OpenAI from 'openai';

import { getHttpProxyAgent } from '@utils/httpProxyAgent';

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('openAiApi');
	const baseURL =
		(this.getNodeParameter('options.baseURL', '') as string) ||
		(credentials.url as string) ||
		'https://api.openai.com/v1';

	const openai = new OpenAI({
		baseURL,
		apiKey: credentials.apiKey as string,
		httpAgent: getHttpProxyAgent(),
	});
	const { data: models = [] } = await openai.models.list();

	const filteredModels = models.filter((model: { id: string }) => {
		const url = baseURL && new URL(baseURL);
		const isCustomAPI = url && url.hostname !== 'api.openai.com';
		// Filter out TTS, embedding, image generation, and other models
		const isInvalidModel =
			!isCustomAPI &&
			(model.id.startsWith('babbage') ||
				model.id.startsWith('davinci') ||
				model.id.startsWith('computer-use') ||
				model.id.startsWith('dall-e') ||
				model.id.startsWith('text-embedding') ||
				model.id.startsWith('tts') ||
				model.id.startsWith('whisper') ||
				model.id.startsWith('omni-moderation') ||
				(model.id.startsWith('gpt-') && model.id.includes('instruct')));

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
