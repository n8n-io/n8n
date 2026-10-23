import { baseUrl, getJson } from '../request';
import type { ListModelsFn, ProviderModel } from '../types';

/**
 * Source: LmChatOllama `loadOptions` routing — the model names served by the
 * user's own Ollama server at `GET {baseUrl}/api/tags`.
 */
export const listOllamaModels: ListModelsFn = async (options) => {
	// The node only sends the bearer header when an API key is configured;
	// a default Ollama install accepts unauthenticated local requests.
	const headers: Record<string, string> = options.apiKey
		? { Authorization: `Bearer ${options.apiKey}` }
		: {};
	const data = (await getJson(
		`${baseUrl(options, 'http://localhost:11434')}/api/tags`,
		headers,
		options,
		'ollama',
	)) as { models?: Array<{ name?: unknown }> };

	const models = (data.models ?? [])
		.filter(
			(model): model is { name: string } =>
				typeof model.name === 'string' && model.name !== '',
		)
		.map((model): ProviderModel => ({ id: model.name, name: model.name }));

	return models.sort((a, b) => a.name.localeCompare(b.name));
};
