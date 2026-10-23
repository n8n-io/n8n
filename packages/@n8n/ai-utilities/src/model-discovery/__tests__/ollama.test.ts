import { listModelsForProvider } from '../index';

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

describe('ollama', () => {
	it('lists model names from the user server /api/tags, sorted by name', async () => {
		const fetch = mockFetch({
			models: [
				{ name: 'qwen3:8b', modified_at: '2026-01-01T00:00:00Z', size: 1 },
				{ name: 'llama3.2', modified_at: '2025-01-01T00:00:00Z', size: 2 },
			],
		});

		const models = await listModelsForProvider('ollama', {
			apiKey: '',
			baseURL: 'http://my-server:11434/',
			fetch,
		});

		expect(calledUrl(fetch)).toBe('http://my-server:11434/api/tags');
		expect(calledHeaders(fetch).Authorization).toBeUndefined();
		expect(models).toEqual([
			{ id: 'llama3.2', name: 'llama3.2' },
			{ id: 'qwen3:8b', name: 'qwen3:8b' },
		]);
	});

	it('sends the bearer header only when an API key is configured', async () => {
		const fetch = mockFetch({ models: [{ name: 'llama3.2' }] });

		await listModelsForProvider('ollama', {
			apiKey: 'proxy-key',
			baseURL: 'https://ollama.example.com',
			fetch,
		});

		expect(calledHeaders(fetch).Authorization).toBe('Bearer proxy-key');
	});

	it('falls back to the default local URL without a credential base URL', async () => {
		const fetch = mockFetch({ models: [{ name: 'llama3.2' }] });

		await listModelsForProvider('ollama', { apiKey: '', fetch });

		expect(calledUrl(fetch)).toBe('http://localhost:11434/api/tags');
	});
});
