import { baseUrl, byName, getJson } from '../request';
import type { ListModelsFn } from '../types';

/**
 * Source: LmChatGoogleGemini `loadOptions` routing (GET /v1beta/models,
 * embedding/imagen excluded). Ids keep Google's `models/` prefix, matching the
 * node dropdown values. Auth uses the `x-goog-api-key` header (Google's
 * preferred method) rather than the credential's `?key=` query auth, so the
 * key cannot leak through access logs or proxies.
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
				typeof model.name === 'string' &&
				!model.name.includes('embedding') &&
				!model.name.includes('imagen'),
		)
		.map((model) => ({ id: model.name, name: model.name }))
		.sort(byName);
};
