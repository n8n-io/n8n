import { loadOpenRouterModelIds, openRouterModelsForRun } from '../openrouter-models';

const response = (body: unknown, ok = true) =>
	({ ok, status: ok ? 200 : 503, json: async () => await Promise.resolve(body) }) as Response;

describe('loadOpenRouterModelIds', () => {
	it('returns the listed models as resolver ids', async () => {
		const fetchImpl = vi.fn(
			async () =>
				await Promise.resolve(
					response({ data: [{ id: 'x-ai/grok-4.7' }, { id: 'openai/gpt-5.5' }] }),
				),
		);

		const ids = await loadOpenRouterModelIds(fetchImpl);

		expect(fetchImpl).toHaveBeenCalledWith(
			'https://openrouter.ai/api/v1/models',
			expect.anything(),
		);
		expect(ids).toEqual(new Set(['openrouter/x-ai/grok-4.7', 'openrouter/openai/gpt-5.5']));
	});

	it('returns nothing when the list cannot be read', async () => {
		expect(
			await loadOpenRouterModelIds(async () => await Promise.resolve(response({}, false))),
		).toBeUndefined();
		expect(
			await loadOpenRouterModelIds(async () => await Promise.resolve(response({ data: 'x' }))),
		).toBeUndefined();
		expect(
			await loadOpenRouterModelIds(async () => await Promise.reject(new Error('offline'))),
		).toBeUndefined();
	});
});

describe('openRouterModelsForRun', () => {
	const logger = { warn: vi.fn() };

	it('skips the fetch when no OpenRouter key is set', async () => {
		const fetchImpl = vi.fn();

		expect(
			await openRouterModelsForRun(new Set(['anthropicApi']), logger, fetchImpl),
		).toBeUndefined();
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('loads the list when OpenRouter has a key', async () => {
		const fetchImpl = vi.fn(async () => await Promise.resolve(response({ data: [{ id: 'a/b' }] })));

		expect(await openRouterModelsForRun(new Set(['openRouterApi']), logger, fetchImpl)).toEqual(
			new Set(['openrouter/a/b']),
		);
	});

	it('warns and trusts the naming rules when the list cannot be read', async () => {
		const fetchImpl = vi.fn(async () => await Promise.reject(new Error('offline')));

		expect(
			await openRouterModelsForRun(new Set(['openRouterApi']), logger, fetchImpl),
		).toBeUndefined();
		expect(logger.warn).toHaveBeenCalled();
	});
});
