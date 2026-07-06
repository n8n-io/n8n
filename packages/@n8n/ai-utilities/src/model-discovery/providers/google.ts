import { baseUrl, byName, getJson } from '../request';
import type { ListModelsFn } from '../types';

/**
 * Source: LmChatGoogleGemini `loadOptions` routing (GET /v1beta/models, key
 * query auth, embedding/imagen excluded). Ids keep Google's `models/` prefix,
 * matching the node dropdown values.
 */
export const listGoogleModels: ListModelsFn = async (options) => {
	const base = baseUrl(options, 'https://generativelanguage.googleapis.com');
	const data = (await getJson(
		`${base}/v1beta/models?key=${encodeURIComponent(options.apiKey)}`,
		{},
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
