import { resolveNativeToolSearch } from '../../tools/native-tool-search';
import { createModel } from '../model-factory';
import { routeOpenRouterClaudeModel, withOpenRouterProviderPreference } from '../openrouter';

function bodyText(init: RequestInit | undefined): string {
	if (typeof init?.body !== 'string') throw new Error('Expected a JSON string body');
	return init.body;
}

describe('routeOpenRouterClaudeModel', () => {
	it.each([
		['openrouter/anthropic/claude-sonnet-4.6', 'openrouter-anthropic/claude-sonnet-4-6'],
		['openrouter/anthropic/claude-opus-4.8', 'openrouter-anthropic/claude-opus-4-8'],
		['openrouter/anthropic/claude-opus-5', 'openrouter-anthropic/claude-opus-5'],
		['openrouter/anthropic/claude-haiku-4.5', 'openrouter-anthropic/claude-haiku-4-5'],
	])('routes %s to the Messages endpoint', (id, expected) => {
		expect(routeOpenRouterClaudeModel(id)).toBe(expected);
		expect(routeOpenRouterClaudeModel({ id, apiKey: 'key', url: '' })).toEqual({
			id: expected,
			apiKey: 'key',
			url: '',
		});
	});

	it.each([
		'openrouter/openai/gpt-5.5',
		'openrouter/anthropic/claude-3.5-sonnet',
		'openrouter/anthropic/claude-3.7-sonnet:thinking',
		'anthropic/claude-sonnet-4-6',
	])('leaves %s unchanged', (id) => {
		expect(routeOpenRouterClaudeModel(id)).toBe(id);
	});
});

describe('withOpenRouterProviderPreference', () => {
	it('adds an upstream preference to JSON request bodies', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>(
			async () => await Promise.resolve(new Response('{}')),
		);
		await withOpenRouterProviderPreference(fetch, 'anthropic')('https://x', {
			method: 'POST',
			body: JSON.stringify({ model: 'm' }),
		});
		const body = JSON.parse(bodyText(fetch.mock.calls[0][1])) as Record<string, unknown>;
		expect(body.provider).toEqual({ order: ['anthropic'], allow_fallbacks: true });
	});

	it('keeps a routing preference the caller already set', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>(
			async () => await Promise.resolve(new Response('{}')),
		);
		const original = JSON.stringify({ model: 'm', provider: { only: ['amazon-bedrock'] } });
		await withOpenRouterProviderPreference(fetch, 'anthropic')('https://x', {
			method: 'POST',
			body: original,
		});
		expect(fetch.mock.calls[0][1]?.body).toBe(original);
	});
});

describe('openrouter-anthropic model', () => {
	it('calls the OpenRouter Messages endpoint with provider tool search', async () => {
		const fetch = vi.fn(
			async () =>
				await Promise.resolve(
					new Response(
						JSON.stringify({
							id: 'msg_1',
							type: 'message',
							role: 'assistant',
							model: 'claude-sonnet-4-6',
							content: [{ type: 'text', text: 'ok' }],
							stop_reason: 'end_turn',
							usage: { input_tokens: 1, output_tokens: 1 },
						}),
						{ headers: { 'content-type': 'application/json' } },
					),
				),
		);
		const model = createModel(
			{ id: 'openrouter-anthropic/claude-sonnet-4-6', apiKey: 'or-key' },
			fetch,
		);
		if (typeof model === 'string') throw new Error('Expected a model instance');
		expect(resolveNativeToolSearch(model)?.namespace).toBe('anthropic');

		await model.doGenerate({
			prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
			tools: [
				{
					type: 'function',
					name: 'data_tables',
					description: 'Data tables',
					inputSchema: { type: 'object', properties: {} },
					providerOptions: { anthropic: { deferLoading: true } },
				},
				{
					type: 'provider',
					id: 'anthropic.tool_search_bm25_20251119',
					name: 'tool_search',
					args: {},
				},
			] as never,
		});

		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://openrouter.ai/api/v1/messages');
		expect(new Headers(init.headers).get('authorization')).toBe('Bearer or-key');
		const body = JSON.parse(bodyText(init)) as {
			model: string;
			provider: unknown;
			tools: Array<Record<string, unknown>>;
		};
		expect(body.model).toBe('claude-sonnet-4-6');
		expect(body.provider).toEqual({ order: ['anthropic'], allow_fallbacks: true });
		expect(body.tools).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: 'data_tables', defer_loading: true }),
				expect.objectContaining({ type: 'tool_search_tool_bm25_20251119' }),
			]),
		);
	});
});
