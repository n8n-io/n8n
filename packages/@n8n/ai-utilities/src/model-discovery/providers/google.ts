import { getModelDisplayName, pinPrioritizedModels } from '@n8n/api-types';

import { baseUrl, byName, getJson } from '../request';
import type { ListModelsFn } from '../types';

/**
 * Keep only chat-capable Gemini models. A chat model reports `generateContent`
 * in `supportedGenerationMethods`; embedding (`embedContent`), Veo
 * (`predictLongRunning`), Imagen (`predict`) and AQA (`generateAnswer`) models
 * do not, so require that method. Image, TTS and embedding models are dropped
 * by name as well: they return output a chat chain cannot use, and the method
 * check alone does not hold for a proxied list — Gateway credits report
 * `generateContent` for every model they serve, embeddings included.
 */
export function shouldIncludeGoogleModel(model: {
	name: string;
	supportedGenerationMethods?: unknown;
}): boolean {
	const methods = model.supportedGenerationMethods;
	const supportsChat = Array.isArray(methods) && methods.includes('generateContent');
	return (
		supportsChat &&
		!model.name.includes('image') &&
		!model.name.includes('tts') &&
		!model.name.includes('embedding')
	);
}

/**
 * Source: LmChatGoogleGemini `loadOptions` routing (GET /v1beta/models). Ids
 * keep Google's `models/` prefix, matching the node dropdown values. Auth uses
 * the `x-goog-api-key` header (Google's preferred method) rather than the
 * credential's `?key=` query auth, so the key cannot leak through access logs
 * or proxies.
 */
export const listGoogleModels: ListModelsFn = async (options) => {
	const base = baseUrl(options, 'https://generativelanguage.googleapis.com');
	const data = (await getJson(
		`${base}/v1beta/models`,
		{ 'x-goog-api-key': options.apiKey },
		options,
		'google',
	)) as {
		models?: Array<{
			name?: unknown;
			displayName?: unknown;
			priority?: unknown;
			supportedGenerationMethods?: unknown;
		}>;
	};

	const models = (data.models ?? [])
		.filter(
			(
				model,
			): model is {
				name: string;
				displayName?: unknown;
				priority?: unknown;
				supportedGenerationMethods?: unknown;
			} =>
				typeof model.name === 'string' &&
				shouldIncludeGoogleModel({
					name: model.name,
					supportedGenerationMethods: model.supportedGenerationMethods,
				}),
		)
		.map((model) => ({
			id: model.name,
			name: getGoogleModelLabel(model.name, model.displayName),
			...(typeof model.priority === 'number' ? { priority: model.priority } : {}),
		}))
		.sort(byName);
	return pinPrioritizedModels(models, (model) => model.priority);
};

/**
 * Dropdown label of a Google model: the API's `displayName`, else its product
 * name from `MODEL_DISPLAY_NAMES`, else the id. A `displayName` that only
 * repeats the id (as Gateway credits report unnamed models) does not count.
 */
export function getGoogleModelLabel(modelId: string, displayName?: unknown): string {
	const apiName = typeof displayName === 'string' ? displayName.trim() : '';
	if (apiName && apiName !== modelId && apiName !== modelId.replace(/^models\//, '')) {
		return apiName;
	}
	return getModelDisplayName('google', modelId) ?? modelId;
}
