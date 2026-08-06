import type { ProviderCatalog } from '@n8n/agents/catalog';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { InstanceAiModelCatalogService } from '../instance-ai-model-catalog.service';

const fetchProviderCatalog = vi.fn<() => Promise<ProviderCatalog>>();

class TestInstanceAiModelCatalogService extends InstanceAiModelCatalogService {
	constructor(
		logger: Logger,
		private readonly fetcher: () => Promise<ProviderCatalog>,
	) {
		super(logger);
	}

	protected override async fetchCatalog(): Promise<ProviderCatalog> {
		return await this.fetcher();
	}
}

const catalog: ProviderCatalog = {
	anthropic: {
		id: 'anthropic',
		name: 'Anthropic',
		models: {
			zulu: { id: 'zulu', name: 'Zulu', toolCall: true, cost: { input: 1, output: 2 } },
			alpha: {
				id: 'alpha',
				name: 'Alpha',
				releaseDate: '2026-01-01',
				toolCall: true,
			},
			'image-only': { id: 'image-only', name: 'Image only', toolCall: false },
		},
	},
	openai: {
		id: 'openai',
		name: 'OpenAI',
		models: {
			'gpt-tools': { id: 'gpt-tools', name: 'GPT Tools', toolCall: true },
		},
	},
	openrouter: {
		id: 'openrouter',
		name: 'OpenRouter',
		models: {
			'provider/model': { id: 'provider/model', name: 'Provider Model', toolCall: true },
		},
	},
	google: {
		id: 'google',
		name: 'Google',
		models: {
			gemini: { id: 'gemini', name: 'Gemini', toolCall: true },
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

	it('returns sorted tool-capable models for supported providers only', async () => {
		fetchProviderCatalog.mockResolvedValue(catalog);
		const { service, logger } = makeService();

		const result = await service.getModels();
		expect(fetchProviderCatalog).toHaveBeenCalledOnce();
		expect(logger.warn).not.toHaveBeenCalled();
		expect(result).toEqual({
			models: {
				anthropic: [
					{ id: 'alpha', name: 'Alpha', releaseDate: '2026-01-01' },
					{ id: 'zulu', name: 'Zulu' },
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
					missingName: { id: 'missing-name', toolCall: true },
					null: null,
					valid: { id: 'valid', name: 'Valid', toolCall: true },
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

	it('times out without making the endpoint fail', async () => {
		vi.useFakeTimers();
		fetchProviderCatalog.mockReturnValue(new Promise<ProviderCatalog>(() => {}));
		const { service, logger } = makeService();

		const request = service.getModels();
		await vi.advanceTimersByTimeAsync(5000);

		await expect(request).resolves.toEqual({
			models: { anthropic: [], openai: [], openrouter: [] },
		});
		expect(logger.warn).toHaveBeenCalledWith('Failed to load the Instance AI model catalog', {
			error: 'Model catalog request timed out',
		});
	});
});
