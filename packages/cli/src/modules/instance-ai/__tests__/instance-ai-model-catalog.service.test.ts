import type { ProviderCatalog } from '@n8n/agents/catalog';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { InstanceAiModelCatalogService } from '../instance-ai-model-catalog.service';

const fetchProviderCatalog = vi.fn<(signal: AbortSignal) => Promise<ProviderCatalog>>();

class TestInstanceAiModelCatalogService extends InstanceAiModelCatalogService {
	constructor(
		logger: Logger,
		private readonly fetcher: (signal: AbortSignal) => Promise<ProviderCatalog>,
	) {
		super(logger);
	}

	protected override async fetchCatalog(signal: AbortSignal): Promise<ProviderCatalog> {
		return await this.fetcher(signal);
	}
}

const catalog: ProviderCatalog = {
	anthropic: {
		id: 'anthropic',
		name: 'Anthropic',
		models: {
			zulu: {
				id: 'zulu',
				name: 'Zulu',
				releaseDate: '2026-03-01',
				toolCall: true,
				modalities: { output: ['text'] },
				cost: { input: 1, output: 2 },
			},
			alpha: {
				id: 'alpha',
				name: 'Alpha',
				releaseDate: '2026-01-01',
				toolCall: true,
				modalities: { output: ['text'] },
			},
			beta: {
				id: 'beta',
				name: 'Beta',
				releaseDate: '2026-01-01',
				toolCall: true,
				modalities: { output: ['text'] },
			},
			invalidDate: {
				id: 'invalid-date',
				name: 'Invalid date',
				releaseDate: 'unknown',
				toolCall: true,
				modalities: { output: ['text'] },
			},
			undated: {
				id: 'undated',
				name: 'Undated',
				toolCall: true,
				modalities: { output: ['text'] },
			},
			'image-only': {
				id: 'image-only',
				name: 'Image only',
				toolCall: true,
				modalities: { output: ['image'] },
			},
			'mixed-output': {
				id: 'mixed-output',
				name: 'Mixed output',
				toolCall: true,
				modalities: { output: ['text', 'audio'] },
			},
			'missing-modalities': {
				id: 'missing-modalities',
				name: 'Missing modalities',
				toolCall: true,
			},
			'no-tools': {
				id: 'no-tools',
				name: 'No tools',
				toolCall: false,
				modalities: { output: ['text'] },
			},
		},
	},
	openai: {
		id: 'openai',
		name: 'OpenAI',
		models: {
			'gpt-tools': {
				id: 'gpt-tools',
				name: 'GPT Tools',
				toolCall: true,
				modalities: { output: ['text'] },
			},
		},
	},
	openrouter: {
		id: 'openrouter',
		name: 'OpenRouter',
		models: {
			'provider/model': {
				id: 'provider/model',
				name: 'Provider Model',
				toolCall: true,
				modalities: { output: ['text'] },
			},
		},
	},
	google: {
		id: 'google',
		name: 'Google',
		models: {
			gemini: {
				id: 'gemini',
				name: 'Gemini',
				toolCall: true,
				modalities: { output: ['text'] },
			},
		},
	},
};

function makeService() {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	return {
		service: new TestInstanceAiModelCatalogService(logger, fetchProviderCatalog),
		logger,
	};
}

describe('InstanceAiModelCatalogService', () => {
	beforeEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it('returns newest compatible models first for supported providers only', async () => {
		fetchProviderCatalog.mockResolvedValue(catalog);
		const { service, logger } = makeService();

		const result = await service.getModels();
		expect(fetchProviderCatalog).toHaveBeenCalledOnce();
		expect(logger.warn).not.toHaveBeenCalled();
		expect(result).toEqual({
			models: {
				anthropic: [
					{ id: 'zulu', name: 'Zulu', releaseDate: '2026-03-01' },
					{ id: 'alpha', name: 'Alpha', releaseDate: '2026-01-01' },
					{ id: 'beta', name: 'Beta', releaseDate: '2026-01-01' },
					{ id: 'invalid-date', name: 'Invalid date', releaseDate: 'unknown' },
					{ id: 'undated', name: 'Undated' },
				],
				openai: [{ id: 'gpt-tools', name: 'GPT Tools' }],
				openrouter: [{ id: 'provider/model', name: 'Provider Model' }],
			},
		});
	});

	it('omits malformed catalog entries', async () => {
		fetchProviderCatalog.mockResolvedValue({
			anthropic: {
				id: 'anthropic',
				name: 'Anthropic',
				models: {
					missingName: {
						id: 'missing-name',
						toolCall: true,
						modalities: { output: ['text'] },
					},
					null: null,
					valid: {
						id: 'valid',
						name: 'Valid',
						toolCall: true,
						modalities: { output: ['text'] },
					},
				},
			},
		} as unknown as ProviderCatalog);
		const { service } = makeService();

		await expect(service.getModels()).resolves.toEqual({
			models: {
				anthropic: [{ id: 'valid', name: 'Valid' }],
				openai: [],
				openrouter: [],
			},
		});
	});

	it('de-duplicates concurrent fetches and caches successful results for one hour', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-06T10:00:00Z'));
		let resolveFetch: (value: ProviderCatalog) => void = () => {};
		fetchProviderCatalog.mockImplementation(
			async () =>
				await new Promise<ProviderCatalog>((resolve) => {
					resolveFetch = resolve;
				}),
		);
		const { service } = makeService();

		const first = service.getModels();
		const second = service.getModels();
		expect(fetchProviderCatalog).toHaveBeenCalledOnce();
		resolveFetch(catalog);
		await expect(Promise.all([first, second])).resolves.toHaveLength(2);

		await service.getModels();
		expect(fetchProviderCatalog).toHaveBeenCalledOnce();

		vi.advanceTimersByTime(60 * 60 * 1000 + 1);
		fetchProviderCatalog.mockResolvedValue(catalog);
		await service.getModels();
		expect(fetchProviderCatalog).toHaveBeenCalledTimes(2);
	});

	it('falls back to stale data or empty provider arrays when refresh fails', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-06T10:00:00Z'));
		fetchProviderCatalog.mockResolvedValueOnce(catalog).mockRejectedValue(new Error('offline'));
		const { service, logger } = makeService();
		const initial = await service.getModels();

		vi.advanceTimersByTime(60 * 60 * 1000 + 1);
		await expect(service.getModels()).resolves.toEqual(initial);
		expect(logger.warn).toHaveBeenCalled();

		fetchProviderCatalog.mockRejectedValue(new Error('still offline'));
		const { service: emptyService } = makeService();
		await expect(emptyService.getModels()).resolves.toEqual({
			models: { anthropic: [], openai: [], openrouter: [] },
		});
	});

	it('aborts a timed-out fetch before allowing a retry', async () => {
		vi.useFakeTimers();
		let activeRequests = 0;
		let maxActiveRequests = 0;
		let firstSignal: AbortSignal | undefined;
		fetchProviderCatalog
			.mockImplementationOnce(
				async (signal) =>
					await new Promise<ProviderCatalog>((_resolve, reject) => {
						firstSignal = signal;
						activeRequests++;
						maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
						signal.addEventListener(
							'abort',
							() => {
								activeRequests--;
								reject(new Error('aborted'));
							},
							{ once: true },
						);
					}),
			)
			.mockImplementationOnce(async () => {
				activeRequests++;
				maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
				activeRequests--;
				return catalog;
			});
		const { service, logger } = makeService();

		const request = service.getModels();
		await vi.advanceTimersByTimeAsync(5000);

		await expect(request).resolves.toEqual({
			models: { anthropic: [], openai: [], openrouter: [] },
		});
		expect(logger.warn).toHaveBeenCalledWith('Failed to load the Instance AI model catalog', {
			error: 'Model catalog request timed out',
		});
		expect(firstSignal?.aborted).toBe(true);

		await expect(service.getModels()).resolves.toEqual(
			expect.objectContaining({ models: expect.objectContaining({ openai: expect.any(Array) }) }),
		);
		expect(fetchProviderCatalog).toHaveBeenCalledTimes(2);
		expect(maxActiveRequests).toBe(1);
	});
});
