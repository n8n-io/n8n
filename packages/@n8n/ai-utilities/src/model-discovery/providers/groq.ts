import { baseUrl, bearerHeaders, getJson, idsToModels } from '../request';
import type { ListModelsFn } from '../types';

/** Source: LmChatGroq `loadOptions` routing (active model objects only). */
export const listGroqModels: ListModelsFn = async (options) => {
	const data = (await getJson(
		`${baseUrl(options, 'https://api.groq.com/openai/v1')}/models`,
		bearerHeaders(options),
		options,
		'groq',
	)) as { data?: Array<{ id?: unknown; active?: unknown; object?: unknown }> };

	return idsToModels(
		(data.data ?? []).filter((model) => model.active === true && model.object === 'model'),
	);
};
