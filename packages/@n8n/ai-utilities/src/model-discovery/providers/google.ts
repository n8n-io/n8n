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
	)) as { models?: Array<{ name?: unknown; supportedGenerationMethods?: unknown }> };

	return (data.models ?? [])
		.filter(
			(model): model is { name: string; supportedGenerationMethods?: unknown } =>
				typeof model.name === 'string' &&
				shouldIncludeGoogleModel({
					name: model.name,
					supportedGenerationMethods: model.supportedGenerationMethods,
				}),
		)
		.map((model) => ({ id: model.name, name: model.name }))
		.sort(byName);
};
