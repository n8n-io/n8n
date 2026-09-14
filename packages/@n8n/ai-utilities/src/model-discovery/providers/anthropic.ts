import { baseUrl, getJson } from '../request';
import type { ListModelsFn } from '../types';

/** Source: LMChatAnthropic `methods/searchModels.ts` (GET /v1/models, newest first). */
export const listAnthropicModels: ListModelsFn = async (options) => {
	const data = (await getJson(
		`${baseUrl(options, 'https://api.anthropic.com')}/v1/models`,
		{ 'x-api-key': options.apiKey, 'anthropic-version': '2023-06-01' },
		options,
		'anthropic',
	)) as { data?: Array<{ id: string; display_name?: string; created_at?: string }> };

	return (data.data ?? [])
		.slice()
		.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
		.map((model) => ({ id: model.id, name: model.display_name ?? model.id }));
};
