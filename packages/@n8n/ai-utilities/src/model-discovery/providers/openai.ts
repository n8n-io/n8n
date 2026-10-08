import { baseUrl, bearerHeaders, byName, getJson, idsToModels, type IdItem } from '../request';
import type { ListModelsFn } from '../types';

export const OFFICIAL_OPENAI_HOSTNAMES = ['api.openai.com', 'ai-assistant.n8n.io'];

export function isOpenAiCustomEndpoint(baseURL?: string): boolean {
	if (baseURL === undefined) return false;

	try {
		return !OFFICIAL_OPENAI_HOSTNAMES.includes(new URL(baseURL).hostname);
	} catch {
		return true;
	}
}

/**
 * On the official API, exclude non-chat model families; on custom
 * (proxy/self-hosted) hosts include all, since their naming is not OpenAI's.
 *
 * Single source of truth for every OpenAI model dropdown: the LMChatOpenAi
 * sub-node, the OpenAI node's `modelSearch`, and the agents model catalog.
 */
export function shouldIncludeOpenAiModel(modelId: string, isCustomApi: boolean): boolean {
	if (isCustomApi) return true;
	return !(
		modelId.startsWith('babbage') ||
		modelId.startsWith('davinci') ||
		modelId.startsWith('computer-use') ||
		modelId.startsWith('dall-e') ||
		// Newer non-chat families are named gpt-*, so they clear the gpt- prefix and
		// have to be matched by infix. Only list families unsupported on *both*
		// chat/completions and responses: gpt-audio-* is absent on purpose, it works
		// on chat/completions.
		modelId.includes('-image') ||
		modelId.includes('-transcribe') ||
		modelId.includes('-diarize') ||
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
	const isCustomApi = isOpenAiCustomEndpoint(base);
	const data = (await getJson(`${base}/models`, bearerHeaders(options), options, 'openai')) as {
		data?: IdItem[];
	};

	return idsToModels(data.data ?? [])
		.filter((model) => shouldIncludeOpenAiModel(model.id, isCustomApi))
		.sort(byName);
};
