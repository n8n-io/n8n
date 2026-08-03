import { baseUrl, bearerHeaders, byName, getJson, idsToModels, type IdItem } from '../request';
import type { ListModelsFn } from '../types';

/** Source: LmChatMistralCloud `loadOptions` routing (embedding models excluded). */
export const listMistralModels: ListModelsFn = async (options) => {
	const data = (await getJson(
		`${baseUrl(options, 'https://api.mistral.ai/v1')}/models`,
		bearerHeaders(options),
		options,
		'mistral',
	)) as { data?: IdItem[] };

	return idsToModels(data.data ?? [])
		.filter((model) => !model.id.includes('embed'))
		.sort(byName);
};
