import { listModelsForProvider, MODEL_DISCOVERY_PROVIDERS } from '../index';

function mockFetch(body: unknown, ok = true, status = 200) {
	return vi.fn().mockResolvedValue({
		ok,
		status,
		text: async () => JSON.stringify(body),
		json: async () => body,
	}) as unknown as typeof globalThis.fetch;
}

function calledUrl(fetchFn: unknown): string {
	return String((fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][0]);
}

function calledHeaders(fetchFn: unknown): Record<string, string> {
	const init = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
		headers: Record<string, string>;
	};
	return init.headers;
}

describe('model-discovery', () => {
	describe('anthropic', () => {
		it('lists models from /v1/models with x-api-key auth, newest first', async () => {
			const fetch = mockFetch({
				data: [
					{ id: 'claude-old', display_name: 'Claude Old', created_at: '2024-01-01T00:00:00Z' },
					{ id: 'claude-new', display_name: 'Claude New', created_at: '2026-01-01T00:00:00Z' },
				],
			});

			const models = await listModelsForProvider('anthropic', { apiKey: 'key', fetch });

			expect(calledUrl(fetch)).toBe('https://api.anthropic.com/v1/models');
			expect(calledHeaders(fetch)['x-api-key']).toBe('key');
			expect(calledHeaders(fetch)['anthropic-version']).toBe('2023-06-01');
			expect(models).toEqual([
				{ id: 'claude-new', name: 'Claude New' },
				{ id: 'claude-old', name: 'Claude Old' },
			]);
		});

		it('respects a custom baseURL', async () => {
			const fetch = mockFetch({ data: [] });
			await listModelsForProvider('anthropic', {
				apiKey: 'key',
				baseURL: 'https://proxy.example.com/',
				fetch,
			});
			expect(calledUrl(fetch)).toBe('https://proxy.example.com/v1/models');
		});
	});

	describe('openai', () => {
		it('filters out non-chat models on the official API and sorts by id', async () => {
			const fetch = mockFetch({
				data: [
					{ id: 'gpt-5' },
					{ id: 'whisper-1' },
					{ id: 'dall-e-3' },
					{ id: 'text-embedding-3-small' },
					{ id: 'gpt-4o' },
				],
			});

			const models = await listModelsForProvider('openai', { apiKey: 'key', fetch });

			expect(calledUrl(fetch)).toBe('https://api.openai.com/v1/models');
			expect(calledHeaders(fetch).Authorization).toBe('Bearer key');
			expect(models.map((m) => m.id)).toEqual(['gpt-4o', 'gpt-5']);
		});

		it('includes all models for a custom (non-OpenAI) baseURL', async () => {
			const fetch = mockFetch({ data: [{ id: 'whisper-1' }, { id: 'my-model' }] });

			const models = await listModelsForProvider('openai', {
				apiKey: 'key',
				baseURL: 'https://llm.internal.example.com/v1',
				fetch,
			});

			expect(models.map((m) => m.id)).toEqual(['my-model', 'whisper-1']);
		});

		it('merges caller-supplied headers into the request', async () => {
			const fetch = mockFetch({ data: [] });
			await listModelsForProvider('openai', {
				apiKey: 'key',
				headers: { 'x-custom': 'yes' },
				fetch,
			});
			expect(calledHeaders(fetch)['x-custom']).toBe('yes');
		});
	});

	describe('google', () => {
		it('lists models from /v1beta/models with header auth, excluding embedding/imagen', async () => {
			const fetch = mockFetch({
				models: [
					{ name: 'models/gemini-2.5-flash', description: 'Fast' },
					{ name: 'models/text-embedding-004', description: 'Embeddings' },
					{ name: 'models/imagen-3', description: 'Images' },
					{ name: 'models/gemini-2.5-pro', description: 'Smart' },
				],
			});

			const models = await listModelsForProvider('google', { apiKey: 'g-key', fetch });

			// The API key goes in the x-goog-api-key header, never the query string,
			// so it cannot leak through access logs or proxies.
			expect(calledUrl(fetch)).toBe('https://generativelanguage.googleapis.com/v1beta/models');
			expect(calledHeaders(fetch)['x-goog-api-key']).toBe('g-key');
			expect(models).toEqual([
				{ id: 'models/gemini-2.5-flash', name: 'models/gemini-2.5-flash' },
				{ id: 'models/gemini-2.5-pro', name: 'models/gemini-2.5-pro' },
			]);
		});
	});

	describe('groq', () => {
		it('keeps only active model objects', async () => {
			const fetch = mockFetch({
				data: [
					{ id: 'llama-3.3-70b', active: true, object: 'model' },
					{ id: 'retired-model', active: false, object: 'model' },
					{ id: 'not-a-model', active: true, object: 'other' },
				],
			});

			const models = await listModelsForProvider('groq', { apiKey: 'key', fetch });

			expect(calledUrl(fetch)).toBe('https://api.groq.com/openai/v1/models');
			expect(models.map((m) => m.id)).toEqual(['llama-3.3-70b']);
		});
	});

	describe('mistral', () => {
		it('excludes embedding models and sorts by name', async () => {
			const fetch = mockFetch({
				data: [{ id: 'mistral-large' }, { id: 'mistral-embed' }, { id: 'codestral' }],
			});

			const models = await listModelsForProvider('mistral', { apiKey: 'key', fetch });

			expect(calledUrl(fetch)).toBe('https://api.mistral.ai/v1/models');
			expect(models.map((m) => m.id)).toEqual(['codestral', 'mistral-large']);
		});
	});

	describe('cohere', () => {
		it('lists chat models by name', async () => {
			const fetch = mockFetch({
				models: [{ name: 'command-r-plus' }, { name: 'command-a-03-2025' }],
			});

			const models = await listModelsForProvider('cohere', { apiKey: 'key', fetch });

			expect(calledUrl(fetch)).toBe('https://api.cohere.ai/v1/models?page_size=100&endpoint=chat');
			expect(models.map((m) => m.id)).toEqual(['command-a-03-2025', 'command-r-plus']);
		});
	});

	describe('nvidia', () => {
		it('keeps only supported Nemotron models', async () => {
			const fetch = mockFetch({
				data: [
					{ id: 'nvidia/llama-3.3-nemotron-super-49b-v1' },
					{ id: 'meta/llama-3.1-405b-instruct' },
				],
			});

			const models = await listModelsForProvider('nvidia', { apiKey: 'key', fetch });

			expect(calledUrl(fetch)).toBe('https://integrate.api.nvidia.com/v1/models');
			expect(models.map((m) => m.id)).toEqual(['nvidia/llama-3.3-nemotron-super-49b-v1']);
		});
	});

	describe.each([
		['deepseek', 'https://api.deepseek.com/models'],
		['openrouter', 'https://openrouter.ai/api/v1/models'],
		['xai', 'https://api.x.ai/v1/models'],
		['vercel', 'https://ai-gateway.vercel.sh/v1/models'],
	] as const)('%s', (provider, expectedUrl) => {
		it('lists models with bearer auth, sorted by name', async () => {
			const fetch = mockFetch({ data: [{ id: 'model-b' }, { id: 'model-a' }] });

			const models = await listModelsForProvider(provider, { apiKey: 'key', fetch });

			expect(calledUrl(fetch)).toBe(expectedUrl);
			expect(calledHeaders(fetch).Authorization).toBe('Bearer key');
			expect(models.map((m) => m.id)).toEqual(['model-a', 'model-b']);
		});
	});

	describe('error handling', () => {
		it('throws a descriptive error on a non-2xx response', async () => {
			const fetch = mockFetch({ error: { message: 'invalid x-api-key' } }, false, 401);

			await expect(listModelsForProvider('anthropic', { apiKey: 'bad', fetch })).rejects.toThrow(
				/anthropic.*401/i,
			);
		});

		it('throws for an unknown provider', async () => {
			await expect(
				listModelsForProvider('not-a-provider', { apiKey: 'key', fetch: mockFetch({}) }),
			).rejects.toThrow(/unknown/i);
		});
	});

	it('exposes a registry of all supported providers', () => {
		expect(Object.keys(MODEL_DISCOVERY_PROVIDERS).sort()).toEqual([
			'anthropic',
			'cohere',
			'deepseek',
			'google',
			'groq',
			'mistral',
			'nvidia',
			'openai',
			'openrouter',
			'vercel',
			'xai',
		]);
	});
});
