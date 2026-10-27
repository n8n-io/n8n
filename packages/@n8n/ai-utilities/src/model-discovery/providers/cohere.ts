import { baseUrl, bearerHeaders, byName, getJson } from '../request';
import type { ListModelsFn } from '../types';

/** Source: LmChatCohere `loadOptions` routing (chat endpoint models only). */
export const listCohereModels: ListModelsFn = async (options) => {
	const data = (await getJson(
		`${baseUrl(options, 'https://api.cohere.ai')}/v1/models?page_size=100&endpoint=chat`,
		bearerHeaders(options),
		options,
		'cohere',
	)) as { models?: Array<{ name?: unknown }> };

	return (data.models ?? [])
		.filter((model): model is { name: string } => typeof model.name === 'string')
		.map((model) => ({ id: model.name, name: model.name }))
		.sort(byName);
};
