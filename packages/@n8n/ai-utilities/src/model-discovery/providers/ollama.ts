import { baseUrl, getJson } from '../request';
import type { ListModelsFn, ProviderModel } from '../types';

/**
 * Source: LmChatOllama `loadOptions` routing — the model names served by the
 * user's own Ollama server at `GET {baseUrl}/api/tags`.
 */
export const listOllamaModels: ListModelsFn = async (options) => {
	const target = baseUrl(options, 'http://localhost:11434');
	// The node only sends the bearer token when an API key is configured;
	// a default Ollama install accepts unauthenticated local requests. The key
	// is only sent over https or to a loopback address, never to a plaintext
	// remote host.
	const isLoopback = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(target);
	const headers: Record<string, string> =
		options.apiKey && (target.startsWith('https://') || isLoopback)
			? { Authorization: `Bearer ${options.apiKey}` }
			: {};
	const data = (await getJson(
		`${target}/api/tags`,
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
