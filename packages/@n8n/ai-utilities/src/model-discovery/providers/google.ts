import { baseUrl, byName, getJson } from '../request';
import type { ListModelsFn } from '../types';

/**
 * Keep only chat-capable Gemini models. Google's model list mixes in embedding
 * models (`embedding` in the name) and image models (`imagen-*` and
 * `gemini-*-image`, both matched by the `image` infix), which a chat chain
 * cannot use, so drop any model whose name marks it as one of those.
 */
export function shouldIncludeGoogleModel(name: string): boolean {
	return !name.includes('embedding') && !name.includes('image');
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
	)) as { models?: Array<{ name?: unknown }> };

	return (data.models ?? [])
		.filter(
			(model): model is { name: string } =>
				typeof model.name === 'string' && shouldIncludeGoogleModel(model.name),
		)
		.map((model) => ({ id: model.name, name: model.name }))
		.sort(byName);
};
