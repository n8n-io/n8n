import { computeCost, fetchProviderCatalog } from '../catalog';

describe('fetchProviderCatalog', () => {
	const originalFetch = global.fetch;

	afterEach(() => {
		global.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it('returns provider ids that match the agents runtime', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () =>
				await Promise.resolve({
					openai: {
						id: 'openai',
						name: 'OpenAI',
						models: {
							'gpt-5': {
								id: 'gpt-5',
								name: 'GPT-5',
								tool_call: true,
							},
						},
					},
					'amazon-bedrock': {
						id: 'amazon-bedrock',
						name: 'Amazon Bedrock',
						models: {
							'anthropic.claude-sonnet-4-5-v1:0': {
								id: 'anthropic.claude-sonnet-4-5-v1:0',
								name: 'Claude Sonnet 4.5',
							},
						},
					},
					azure: {
						id: 'azure',
						name: 'Azure',
						models: {
							'gpt-4o': {
								id: 'gpt-4o',
								name: 'GPT-4o',
							},
						},
					},
					'azure-cognitive-services': {
						id: 'azure-cognitive-services',
						name: 'Azure Cognitive Services',
						models: {
							'cohere-command-a': {
								id: 'cohere-command-a',
								name: 'Command A',
							},
						},
					},
				}),
		});
		global.fetch = fetchMock as typeof fetch;

		const catalog = await fetchProviderCatalog();

		expect(catalog.openai.models['gpt-5'].toolCall).toBe(true);
		expect(catalog['aws-bedrock'].models['anthropic.claude-sonnet-4-5-v1:0'].name).toBe(
			'Claude Sonnet 4.5',
		);
		expect(catalog['azure-openai'].models['gpt-4o'].name).toBe('GPT-4o');
		expect(catalog['azure-openai'].models['cohere-command-a'].name).toBe('Command A');
		expect(catalog['amazon-bedrock']).toBeUndefined();
		expect(catalog.azure).toBeUndefined();
		expect(catalog['azure-cognitive-services']).toBeUndefined();
	});

	it('drops models marked deprecated on models.dev', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () =>
				await Promise.resolve({
					anthropic: {
						id: 'anthropic',
						name: 'Anthropic',
						models: {
							'claude-3-haiku-20240307': {
								id: 'claude-3-haiku-20240307',
								name: 'Claude Haiku 3',
								status: 'deprecated',
							},
							'claude-sonnet-4-6': {
								id: 'claude-sonnet-4-6',
								name: 'Claude Sonnet 4.6',
							},
							'claude-beta-model': {
								id: 'claude-beta-model',
								name: 'Claude Beta Model',
								status: 'beta',
							},
						},
					},
				}),
		});
		global.fetch = fetchMock as typeof fetch;

		const catalog = await fetchProviderCatalog();

		expect(catalog.anthropic.models['claude-3-haiku-20240307']).toBeUndefined();
		expect(catalog.anthropic.models['claude-sonnet-4-6'].name).toBe('Claude Sonnet 4.6');
		expect(catalog.anthropic.models['claude-beta-model'].name).toBe('Claude Beta Model');
	});

	it('omits a provider whose models are all deprecated', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () =>
				await Promise.resolve({
					anthropic: {
						id: 'anthropic',
						name: 'Anthropic',
						models: {
							'claude-3-haiku-20240307': {
								id: 'claude-3-haiku-20240307',
								name: 'Claude Haiku 3',
								status: 'deprecated',
							},
						},
					},
					openai: {
						id: 'openai',
						name: 'OpenAI',
						models: {
							'gpt-5': { id: 'gpt-5', name: 'GPT-5' },
						},
					},
				}),
		});
		global.fetch = fetchMock as typeof fetch;

		const catalog = await fetchProviderCatalog();

		expect(catalog.anthropic).toBeUndefined();
		expect(catalog.openai.models['gpt-5'].name).toBe('GPT-5');
	});

	it('strips the "(latest)" suffix from model names and drops duplicate pinned snapshots', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () =>
				await Promise.resolve({
					anthropic: {
						id: 'anthropic',
						name: 'Anthropic',
						models: {
							'claude-opus-4-5': {
								id: 'claude-opus-4-5',
								name: 'Claude Opus 4.5 (latest)',
							},
							'claude-opus-4-5-20251101': {
								id: 'claude-opus-4-5-20251101',
								name: 'Claude Opus 4.5',
							},
							'claude-opus-4-8': {
								id: 'claude-opus-4-8',
								name: 'Claude Opus 4.8',
							},
							'claude-3-5-haiku-latest': {
								id: 'claude-3-5-haiku-latest',
								name: 'Claude Haiku 3.5 (latest)',
							},
						},
					},
					google: {
						id: 'google',
						name: 'Google',
						models: {
							'gemini-flash-latest': {
								id: 'gemini-flash-latest',
								name: 'Gemini Flash Latest',
							},
						},
					},
				}),
		});
		global.fetch = fetchMock as typeof fetch;

		const catalog = await fetchProviderCatalog();

		// Alias keeps its id but loses the "(latest)" tag
		expect(catalog.anthropic.models['claude-opus-4-5'].name).toBe('Claude Opus 4.5');
		expect(catalog.anthropic.models['claude-3-5-haiku-latest'].name).toBe('Claude Haiku 3.5');
		// Pinned snapshot with the same name as an alias is dropped
		expect(catalog.anthropic.models['claude-opus-4-5-20251101']).toBeUndefined();
		// Models without a same-named alias are untouched
		expect(catalog.anthropic.models['claude-opus-4-8'].name).toBe('Claude Opus 4.8');
		// Only the parenthesized suffix is stripped, not other "latest" naming
		expect(catalog.google.models['gemini-flash-latest'].name).toBe('Gemini Flash Latest');
	});
});

describe('computeCost', () => {
	it('bills all prompt tokens at the flat input rate when there is no cache breakdown', () => {
		const cost = computeCost(
			{ promptTokens: 1_000_000, completionTokens: 1_000_000 },
			{ input: 3, output: 15 },
		);

		expect(cost).toBeCloseTo(18);
	});

	it('bills each cache tier at its catalog rate when a breakdown is present', () => {
		const cost = computeCost(
			{
				promptTokens: 1_000_000,
				completionTokens: 0,
				inputTokenDetails: { noCache: 200_000, cacheRead: 500_000, cacheWrite: 300_000 },
			},
			{ input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
		);

		expect(cost).toBeCloseTo(1.875);
	});

	it('falls back to the flat input rate for cache tiers missing a catalog rate', () => {
		const cost = computeCost(
			{
				promptTokens: 1_000_000,
				completionTokens: 0,
				inputTokenDetails: { noCache: 500_000, cacheRead: 500_000 },
			},
			{ input: 3, output: 15 },
		);

		expect(cost).toBeCloseTo(3);
	});

	it('scales the cache-write rate for a 1h Anthropic TTL when a cacheWrite rate is present', () => {
		const cost = computeCost(
			{
				promptTokens: 1_000_000,
				completionTokens: 0,
				inputTokenDetails: { cacheWrite: 1_000_000 },
			},
			{ input: 3, output: 15, cacheWrite: 3.75 },
			{ anthropicCacheTtl: '1h' },
		);

		expect(cost).toBeCloseTo(3.75 * 1.6);
	});

	it('scales the flat input rate for a 1h Anthropic TTL when no cacheWrite rate is available', () => {
		const cost = computeCost(
			{
				promptTokens: 1_000_000,
				completionTokens: 0,
				inputTokenDetails: { cacheWrite: 1_000_000 },
			},
			{ input: 3, output: 15 },
			{ anthropicCacheTtl: '1h' },
		);

		expect(cost).toBeCloseTo(3 * 2);
	});
});
