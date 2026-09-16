import { fetchProviderCatalog, type ModelInfo, type ProviderCatalog } from '@n8n/agents/catalog';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { ModelCatalogService } from '../model-catalog.service';
import { searchModelsOutputSchema } from '../schemas';

vi.mock('@n8n/agents/catalog', () => ({ fetchProviderCatalog: vi.fn() }));

const fetchCatalog = vi.mocked(fetchProviderCatalog);
const HOUR = 60 * 60 * 1000;

function model(id: string, overrides: Partial<ModelInfo> = {}): ModelInfo {
	return {
		id,
		name: id,
		toolCall: false,
		toolCallKnown: false,
		modalities: { input: ['text'], output: ['text'] },
		...overrides,
	};
}

function catalog(models: ModelInfo[], provider = 'openai'): ProviderCatalog {
	return {
		[provider]: {
			id: provider,
			name: provider,
			models: Object.fromEntries(models.map((entry) => [entry.id, entry])),
		},
	};
}

describe('ModelCatalogService', () => {
	let service: ModelCatalogService;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-16T12:00:00Z'));
		fetchCatalog.mockReset();
		service = new ModelCatalogService();
	});

	afterEach(() => vi.useRealTimers());

	it('orders text models by release date, preserves previews and tiers, and reports omitted results', async () => {
		fetchCatalog.mockResolvedValue(
			catalog([
				model('old-large', { releaseDate: '2025-12-01' }),
				model('new-small', { releaseDate: '2026-09-01', status: 'beta' }),
				model('new-large', { releaseDate: '2026-09-01' }),
				model('image-only', { releaseDate: '2026-09-15', modalities: { output: ['image'] } }),
				model('retired', { releaseDate: '2026-09-14', status: 'deprecated' }),
				model('unknown-output', { modalities: undefined }),
				model('transcription', { modalities: { input: ['audio'], output: ['text'] } }),
			]),
		);

		const result = await service.search({ provider: 'OpenAI', limit: 2 });

		expect(result.status).toBe('ok');
		expect(result.models.map((entry) => entry.id)).toEqual(['new-large', 'new-small']);
		expect(result.models[1].status).toBe('beta');
		expect(result.hasMore).toBe(true);
		expect(searchModelsOutputSchema.safeParse(result).success).toBe(true);
	});

	it('puts missing and invalid release dates last without inferring dates from model IDs', async () => {
		fetchCatalog.mockResolvedValue(
			catalog([
				model('future-2099'),
				model('invalid-day', { releaseDate: '2026-02-30' }),
				model('invalid-month', { releaseDate: '2026-09' }),
				model('known-date', { releaseDate: '2026-01-01' }),
			]),
		);

		const result = await service.search({ provider: 'openai', limit: 10 });

		expect(result.models.map((entry) => entry.id)).toEqual([
			'known-date',
			'future-2099',
			'invalid-day',
			'invalid-month',
		]);
		expect(result.models.slice(1).map((entry) => entry.releaseDate)).toEqual([null, null, null]);
		expect(result.hasMore).toBe(false);
	});

	it('filters IDs and names before ordering and limiting, with hasMore scoped to matches', async () => {
		fetchCatalog.mockResolvedValue(
			catalog(
				[
					...Array.from({ length: 12 }, (_, index) =>
						model(`other/model-${index}`, { releaseDate: '2026-09-15' }),
					),
					model('anthropic/claude-small', {
						name: 'Small model',
						releaseDate: '2026-08-01',
					}),
					model('anthropic/assistant', {
						name: 'Claude Assistant',
						releaseDate: '2026-09-01',
					}),
				],
				'openrouter',
			),
		);

		const limited = await service.search({ provider: 'openrouter', query: ' CLAUDE ', limit: 1 });
		expect(limited.models.map(({ id }) => id)).toEqual(['anthropic/assistant']);
		expect(limited.hasMore).toBe(true);

		const all = await service.search({ provider: 'openrouter', query: 'claude', limit: 10 });
		expect(all.models.map(({ id }) => id)).toEqual([
			'anthropic/assistant',
			'anthropic/claude-small',
		]);
		expect(all.hasMore).toBe(false);

		const other = await service.search({ provider: 'openrouter', query: 'other/', limit: 10 });
		expect(other.models).toHaveLength(10);
		expect(other.hasMore).toBe(true);
		expect(fetchCatalog).toHaveBeenCalledOnce();
	});

	it('returns no matches for an unmatched query and treats a blank query as unfiltered', async () => {
		fetchCatalog.mockResolvedValue(catalog([model('example')]));
		expect(await service.search({ provider: 'openai', query: 'missing', limit: 10 })).toMatchObject(
			{
				status: 'no_matching_models',
				models: [],
				hasMore: false,
			},
		);
		const unfiltered = await service.search({ provider: 'openai', limit: 10 });
		expect(await service.search({ provider: 'openai', query: '  ', limit: 10 })).toEqual(
			unfiltered,
		);
		expect(unfiltered.models.map(({ id }) => id)).toEqual(['example']);
		expect(fetchCatalog).toHaveBeenCalledOnce();
	});

	it('normalizes provider aliases while preserving exact model IDs and unknown metadata', async () => {
		fetchCatalog.mockResolvedValue(
			catalog(
				[
					model('models/example-preview'),
					model('models/example-standard', {
						toolCall: false,
						toolCallKnown: true,
						reasoning: false,
						cost: { input: 0, output: 1.2 },
					}),
				],
				'google',
			),
		);

		const result = await service.search({ provider: ' Gemini ', limit: 10 });

		expect(result).toMatchObject({
			provider: 'google',
			source: 'https://models.dev/api.json',
			credentialAccess: 'not_checked',
			freshness: 'fresh',
			fetchedAt: '2026-09-16T12:00:00.000Z',
		});
		expect(result.models[0]).toMatchObject({
			id: 'models/example-preview',
			toolCalling: null,
			reasoning: null,
			status: null,
			pricing: null,
		});
		expect(result.models[1]).toMatchObject({
			toolCalling: false,
			reasoning: false,
			pricing: { currency: 'USD', unit: 'per_million_tokens', input: 0, output: 1.2 },
		});
	});

	it('distinguishes unknown providers from providers with no text-generation models', async () => {
		fetchCatalog.mockResolvedValue(
			catalog([model('image', { modalities: { output: ['image'] } })]),
		);

		expect(await service.search({ provider: 'openai', limit: 10 })).toMatchObject({
			status: 'no_matching_models',
			models: [],
			hasMore: false,
		});
		for (const provider of ['missing', 'constructor', '__proto__']) {
			expect(await service.search({ provider, limit: 10 })).toMatchObject({
				status: 'unknown_provider',
				models: [],
			});
		}
		expect(fetchCatalog).toHaveBeenCalledOnce();
	});

	it('keeps cached metadata isolated from mutations to a returned result', async () => {
		fetchCatalog.mockResolvedValue(catalog([model('example')]));
		const first = await service.search({ provider: 'openai', limit: 10 });
		first.models[0].modalities.output?.splice(0);
		const second = await service.search({ provider: 'openai', limit: 10 });
		expect(second.models[0].modalities.output).toEqual(['text']);
		expect(fetchCatalog).toHaveBeenCalledOnce();
	});

	it('shares concurrent fetches and refreshes the snapshot after one hour', async () => {
		const pending = createDeferredPromise<ProviderCatalog>();
		fetchCatalog.mockReturnValueOnce(pending.promise);
		const first = service.search({ provider: 'openai', limit: 10 });
		const second = service.search({ provider: 'openai', limit: 1 });
		expect(fetchCatalog).toHaveBeenCalledOnce();
		pending.resolve(catalog([model('first')]));
		await Promise.all([first, second]);

		await vi.advanceTimersByTimeAsync(HOUR - 1);
		await service.search({ provider: 'openai', limit: 10 });
		expect(fetchCatalog).toHaveBeenCalledOnce();
		fetchCatalog.mockResolvedValue(catalog([model('second')]));
		await vi.advanceTimersByTimeAsync(1);

		const refreshed = await service.search({ provider: 'openai', limit: 10 });
		expect(refreshed.models[0].id).toBe('second');
		expect(refreshed.fetchedAt).toBe('2026-09-16T13:00:00.000Z');
		expect(fetchCatalog).toHaveBeenCalledTimes(2);
	});

	it('marks cached data stale on failure and refuses it at 24 hours', async () => {
		fetchCatalog.mockResolvedValueOnce(catalog([model('first')]));
		await service.search({ provider: 'openai', limit: 10 });
		fetchCatalog.mockRejectedValue(new Error('Unavailable'));
		await vi.advanceTimersByTimeAsync(HOUR);

		expect(await service.search({ provider: 'openai', limit: 10 })).toMatchObject({
			status: 'ok',
			freshness: 'stale',
			fetchedAt: '2026-09-16T12:00:00.000Z',
			models: [{ id: 'first' }],
		});
		await vi.advanceTimersByTimeAsync(23 * HOUR);
		expect(await service.search({ provider: 'openai', limit: 10 })).toMatchObject({
			status: 'catalog_unavailable',
			freshness: 'unavailable',
			fetchedAt: null,
			models: [],
		});
	});

	it('keeps the last successful snapshot when the parser returns an empty catalog', async () => {
		fetchCatalog.mockResolvedValueOnce(catalog([model('first')]));
		await service.search({ provider: 'openai', limit: 10 });
		fetchCatalog.mockResolvedValue({});
		await vi.advanceTimersByTimeAsync(HOUR);
		expect(await service.search({ provider: 'openai', limit: 10 })).toMatchObject({
			freshness: 'stale',
			models: [{ id: 'first' }],
		});
		expect(await new ModelCatalogService().search({ provider: 'openai', limit: 10 })).toMatchObject(
			{
				status: 'catalog_unavailable',
				models: [],
			},
		);
	});

	it('bounds a stalled fetch to five seconds and retries on a later call', async () => {
		const pending = createDeferredPromise<ProviderCatalog>();
		fetchCatalog.mockReturnValueOnce(pending.promise);
		const result = service.search({ provider: 'openai', limit: 10 });
		await vi.advanceTimersByTimeAsync(5000);
		expect(await result).toMatchObject({ status: 'catalog_unavailable', models: [] });
		expect(fetchCatalog.mock.calls[0][0]?.signal?.aborted).toBe(true);
		pending.resolve(catalog([model('late')]));
		fetchCatalog.mockResolvedValue(catalog([model('retry')]));
		expect((await service.search({ provider: 'openai', limit: 10 })).models[0].id).toBe('retry');
	});

	it('cancels one caller without cancelling a shared fetch for another caller', async () => {
		const pending = createDeferredPromise<ProviderCatalog>();
		fetchCatalog.mockReturnValue(pending.promise);
		const controller = new AbortController();
		const cancelled = service.search({ provider: 'openai', limit: 10 }, controller.signal);
		const active = service.search({ provider: 'openai', limit: 10 });
		const rejected = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
		controller.abort();
		await rejected;
		expect(fetchCatalog.mock.calls[0][0]?.signal?.aborted).toBe(false);
		pending.resolve(catalog([model('available')]));
		expect((await active).models[0].id).toBe('available');
	});

	it('does not fetch for a caller that was already cancelled', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(
			service.search({ provider: 'openai', limit: 10 }, controller.signal),
		).rejects.toMatchObject({ name: 'AbortError' });
		expect(fetchCatalog).not.toHaveBeenCalled();
	});
});
