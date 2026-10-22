import { UserError } from 'n8n-workflow';

import { listModelsForProvider } from '../index';

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status });
}

describe('Ollama model discovery', () => {
	it('lists exact installed names and reads capabilities without prices', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (url, init) => {
			const requestUrl = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
			if (requestUrl.endsWith('/api/tags')) {
				return json({
					models: [
						{ name: 'team/gemma4:latest' },
						{ name: 'embed:latest' },
						{ name: 'chat:4b' },
						{ name: 'team/gemma4:latest' },
						{},
						null,
					],
				});
			}
			if (typeof init?.body !== 'string') throw new Error('Expected a JSON request body');
			const { model } = JSON.parse(init.body) as { model: string };
			return json({
				capabilities:
					model === 'embed:latest'
						? ['embedding']
						: model === 'chat:4b'
							? ['completion']
							: ['completion', 'tools', 'thinking', 'vision'],
				model_info: { 'general.architecture': 'gemma4', 'gemma4.context_length': 262144 },
			});
		});

		const models = await listModelsForProvider('ollama', {
			apiKey: 'proxy-key',
			baseURL: 'https://models.example.com/ollama/',
			fetch,
		});

		expect(models).toEqual([
			{
				id: 'chat:4b',
				name: 'chat:4b',
				metadata: { toolCall: false, reasoning: false, limits: { context: 262144 } },
			},
			{
				id: 'team/gemma4:latest',
				name: 'team/gemma4:latest',
				metadata: { toolCall: true, reasoning: true, limits: { context: 262144 } },
			},
		]);
		expect(fetch).toHaveBeenCalledTimes(4);
		expect(fetch).toHaveBeenCalledWith(
			'https://models.example.com/ollama/api/show',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ model: 'team/gemma4:latest' }),
				headers: { Authorization: 'Bearer proxy-key', 'Content-Type': 'application/json' },
			}),
		);
	});

	it('accepts an empty server without an API key', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(json({ models: [] }));
		expect(await listModelsForProvider('ollama', { apiKey: '', fetch })).toEqual([]);
		expect(fetch).toHaveBeenCalledWith(
			'http://localhost:11434/api/tags',
			expect.objectContaining({ headers: {} }),
		);
	});

	it('keeps installed models when metadata is unavailable or incomplete', async () => {
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockResolvedValueOnce(
				json({ models: [{ name: 'custom:latest' }, { name: 'legacy:latest' }] }),
			)
			.mockResolvedValueOnce(json({ error: 'not supported' }, 404))
			.mockResolvedValueOnce(
				json({ model_info: { 'general.architecture': 'llama', 'llama.context_length': -1 } }),
			);
		expect(await listModelsForProvider('ollama', { apiKey: '', fetch })).toEqual([
			{ id: 'custom:latest', name: 'custom:latest' },
			{ id: 'legacy:latest', name: 'legacy:latest', metadata: {} },
		]);
	});

	it.each([401, 403])('reports rejected credentials (%s)', async (status) => {
		const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(json({}, status));
		await expect(
			listModelsForProvider('ollama', { apiKey: 'invalid', fetch }),
		).rejects.toBeInstanceOf(UserError);
	});

	it.each([{}, { models: null }])('rejects a malformed model list', async (body) => {
		const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(json(body));
		await expect(listModelsForProvider('ollama', { apiKey: '', fetch })).rejects.toThrow();
	});

	it('propagates server failures', async () => {
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockRejectedValue(new Error('connection refused'));
		await expect(listModelsForProvider('ollama', { apiKey: '', fetch })).rejects.toThrow(
			'connection refused',
		);
	});
});
