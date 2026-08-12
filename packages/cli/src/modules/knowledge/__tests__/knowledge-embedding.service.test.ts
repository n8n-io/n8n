import { createEmbeddingModel } from '@n8n/agents';
import type { CredentialsEntity, CredentialsRepository } from '@n8n/db';
import { embed, embedMany } from 'ai';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import { KnowledgeNotConfiguredError } from '../errors';
import { KnowledgeEmbeddingService } from '../knowledge-embedding.service';
import type { KnowledgeSettings, KnowledgeSettingsService } from '../knowledge-settings.service';
import { KnowledgeConfig } from '../knowledge.config';

vi.mock('@n8n/agents', () => ({
	createEmbeddingModel: vi.fn(),
}));

vi.mock('ai', () => ({
	embed: vi.fn(),
	embedMany: vi.fn(),
}));

/** Plain-object results: `mock()` proxies arrays, which breaks deep equality on vectors. */
const embedResult = (embedding: number[]) =>
	({ embedding }) as unknown as Awaited<ReturnType<typeof embed>>;
const embedManyResult = (embeddings: number[][]) =>
	({ embeddings }) as unknown as Awaited<ReturnType<typeof embedMany>>;

const settings = (overrides: Partial<KnowledgeSettings> = {}): KnowledgeSettings => ({
	embedding: { provider: 'openai', credentialId: 'cred-1', model: 'text-embedding-3-small' },
	vectorStore: { provider: 'qdrant', credentialId: 'cred-2', collectionName: 'n8n_knowledge' },
	...overrides,
});

describe('KnowledgeEmbeddingService', () => {
	const settingsService = mock<KnowledgeSettingsService>();
	const credentialsRepository = mock<CredentialsRepository>();
	const credentialsService = mock<CredentialsService>();
	const credential = mock<CredentialsEntity>({ id: 'cred-1', type: 'openAiApi' });

	let service: KnowledgeEmbeddingService;

	beforeEach(() => {
		vi.clearAllMocks();
		settingsService.getSettings.mockResolvedValue(settings());
		credentialsRepository.findOneBy.mockResolvedValue(credential);
		credentialsService.decrypt.mockResolvedValue({ apiKey: 'sk-test' });
		vi.mocked(createEmbeddingModel).mockImplementation((modelId) =>
			mock({ modelId: String(modelId) }),
		);
		vi.mocked(embed).mockResolvedValue(embedResult([0.1, 0.2, 0.3]));

		service = new KnowledgeEmbeddingService(
			settingsService,
			credentialsRepository,
			credentialsService,
			new KnowledgeConfig(),
		);
	});

	describe('when not configured', () => {
		test('embedQuery throws', async () => {
			settingsService.getSettings.mockResolvedValue(settings({ embedding: null }));

			await expect(service.embedQuery('hello')).rejects.toThrow(KnowledgeNotConfiguredError);
			expect(createEmbeddingModel).not.toHaveBeenCalled();
		});

		test('embedMany throws', async () => {
			settingsService.getSettings.mockResolvedValue(settings({ embedding: null }));

			await expect(service.embedMany(['hello'])).rejects.toThrow(KnowledgeNotConfiguredError);
		});

		test('getDimension throws', async () => {
			settingsService.getSettings.mockResolvedValue(settings({ embedding: null }));

			await expect(service.getDimension()).rejects.toThrow(KnowledgeNotConfiguredError);
		});
	});

	describe('model construction', () => {
		test('prefixes the model name with the provider and passes the credential', async () => {
			await service.embedQuery('hello');

			expect(credentialsRepository.findOneBy).toHaveBeenCalledWith({ id: 'cred-1' });
			expect(credentialsService.decrypt).toHaveBeenCalledWith(credential, true);
			expect(createEmbeddingModel).toHaveBeenCalledWith('openai/text-embedding-3-small', {
				apiKey: 'sk-test',
			});
		});

		test('keeps an already prefixed model name as is', async () => {
			settingsService.getSettings.mockResolvedValue(
				settings({
					embedding: {
						provider: 'openai',
						credentialId: 'cred-1',
						model: 'openai/text-embedding-3-large',
					},
				}),
			);

			await service.embedQuery('hello');

			expect(createEmbeddingModel).toHaveBeenCalledWith(
				'openai/text-embedding-3-large',
				expect.anything(),
			);
		});

		test("forwards the credential's custom base URL", async () => {
			credentialsService.decrypt.mockResolvedValue({
				apiKey: 'sk-test',
				url: 'https://proxy.example.com/v1',
			});

			await service.embedQuery('hello');

			expect(createEmbeddingModel).toHaveBeenCalledWith('openai/text-embedding-3-small', {
				apiKey: 'sk-test',
				baseURL: 'https://proxy.example.com/v1',
			});
		});

		test('throws when the configured credential no longer exists', async () => {
			credentialsRepository.findOneBy.mockResolvedValue(null);

			await expect(service.embedQuery('hello')).rejects.toThrow('no longer exists');
		});

		test('throws when the credential has no API key', async () => {
			credentialsService.decrypt.mockResolvedValue({});

			await expect(service.embedQuery('hello')).rejects.toThrow('no API key');
		});
	});

	describe('model cache', () => {
		test('builds the model once across calls', async () => {
			await service.embedQuery('one');
			await service.embedQuery('two');

			expect(createEmbeddingModel).toHaveBeenCalledTimes(1);
			expect(credentialsService.decrypt).toHaveBeenCalledTimes(1);
		});

		test('rebuilds when the configured model changes', async () => {
			await service.embedQuery('one');

			settingsService.getSettings.mockResolvedValue(
				settings({
					embedding: {
						provider: 'openai',
						credentialId: 'cred-1',
						model: 'text-embedding-3-large',
					},
				}),
			);
			await service.embedQuery('two');

			expect(createEmbeddingModel).toHaveBeenCalledTimes(2);
			expect(createEmbeddingModel).toHaveBeenLastCalledWith(
				'openai/text-embedding-3-large',
				expect.anything(),
			);
		});

		test('rebuilds when the configured credential changes', async () => {
			await service.embedQuery('one');

			settingsService.getSettings.mockResolvedValue(
				settings({
					embedding: {
						provider: 'openai',
						credentialId: 'cred-99',
						model: 'text-embedding-3-small',
					},
				}),
			);
			await service.embedQuery('two');

			expect(createEmbeddingModel).toHaveBeenCalledTimes(2);
			expect(credentialsRepository.findOneBy).toHaveBeenLastCalledWith({ id: 'cred-99' });
		});
	});

	describe('embedQuery', () => {
		test('returns the embedding for the given text', async () => {
			await expect(service.embedQuery('hello')).resolves.toEqual([0.1, 0.2, 0.3]);
			expect(embed).toHaveBeenCalledWith({ model: expect.anything(), value: 'hello' });
		});
	});

	describe('embedMany', () => {
		beforeEach(() => {
			// Each batch echoes its values back as single-element vectors, so the
			// assertions can check ordering across batch boundaries.
			vi.mocked(embedMany).mockImplementation(async ({ values }) =>
				embedManyResult(values.map((value: string) => [Number(value)])),
			);
		});

		test('returns no vectors and calls no provider for an empty input', async () => {
			await expect(service.embedMany([])).resolves.toEqual([]);
			expect(embedMany).not.toHaveBeenCalled();
			expect(createEmbeddingModel).not.toHaveBeenCalled();
		});

		test('sends everything in one batch when it fits', async () => {
			const texts = ['1', '2', '3'];

			await expect(service.embedMany(texts)).resolves.toEqual([[1], [2], [3]]);
			expect(embedMany).toHaveBeenCalledTimes(1);
			expect(embedMany).toHaveBeenCalledWith({ model: expect.anything(), values: texts });
		});

		test('splits into batches of embeddingBatchSize and preserves order', async () => {
			const config = new KnowledgeConfig();
			config.embeddingBatchSize = 2;
			service = new KnowledgeEmbeddingService(
				settingsService,
				credentialsRepository,
				credentialsService,
				config,
			);

			const texts = ['1', '2', '3', '4', '5'];

			await expect(service.embedMany(texts)).resolves.toEqual([[1], [2], [3], [4], [5]]);
			expect(embedMany).toHaveBeenCalledTimes(3);
			expect(vi.mocked(embedMany).mock.calls.map(([args]) => args.values)).toEqual([
				['1', '2'],
				['3', '4'],
				['5'],
			]);
		});
	});

	describe('getDimension', () => {
		test('probes the model once and caches the length', async () => {
			await expect(service.getDimension()).resolves.toBe(3);
			await expect(service.getDimension()).resolves.toBe(3);

			expect(embed).toHaveBeenCalledTimes(1);
		});

		test('probes again after the model changes', async () => {
			await service.getDimension();

			settingsService.getSettings.mockResolvedValue(
				settings({
					embedding: {
						provider: 'openai',
						credentialId: 'cred-1',
						model: 'text-embedding-3-large',
					},
				}),
			);
			vi.mocked(embed).mockResolvedValue(embedResult([0, 0, 0, 0]));

			await expect(service.getDimension()).resolves.toBe(4);
			expect(embed).toHaveBeenCalledTimes(2);
		});
	});
});
