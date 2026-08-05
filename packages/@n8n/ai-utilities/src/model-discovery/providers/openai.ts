import { baseUrl, bearerHeaders, byName, getJson, idsToModels, type IdItem } from '../request';
import type { ListModelsFn } from '../types';

const OFFICIAL_OPENAI_HOSTNAMES = ['api.openai.com', 'ai-assistant.n8n.io'];

/**
 * Source: LMChatOpenAi `methods/loadModels.ts` — on the official API, exclude
 * non-chat model families; on custom (proxy/self-hosted) hosts include all.
 */
export function shouldIncludeOpenAiModel(modelId: string, isCustomApi: boolean): boolean {
	if (isCustomApi) return true;
	return !(
		modelId.startsWith('babbage') ||
		modelId.startsWith('davinci') ||
		modelId.startsWith('computer-use') ||
		modelId.startsWith('dall-e') ||
		modelId.startsWith('text-embedding') ||
		modelId.startsWith('tts') ||
		modelId.includes('-tts') ||
		modelId.startsWith('whisper') ||
		modelId.startsWith('omni-moderation') ||
		modelId.startsWith('sora') ||
		modelId.includes('-realtime') ||
		(modelId.startsWith('gpt-') && modelId.includes('instruct'))
	);
}

/** Source: LMChatOpenAi `methods/loadModels.ts` (GET /models, filtered, id asc). */
export const listOpenAiModels: ListModelsFn = async (options) => {
	const base = baseUrl(options, 'https://api.openai.com/v1');
	const isCustomApi = !OFFICIAL_OPENAI_HOSTNAMES.includes(new URL(base).hostname);
	const data = (await getJson(`${base}/models`, bearerHeaders(options), options, 'openai')) as {
		data?: IdItem[];
	};

	return idsToModels(data.data ?? [])
		.filter((model) => shouldIncludeOpenAiModel(model.id, isCustomApi))
		.sort(byName);
};
