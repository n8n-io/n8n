import { mock } from 'vitest-mock-extended';

import type { KnowledgeSource } from '../database/entities';
import type { KnowledgeSourceRepository } from '../database/repositories';
import { KnowledgeNotConfiguredError } from '../errors';
import type { KnowledgeEmbeddingService } from '../knowledge-embedding.service';
import { KnowledgeSearchService } from '../knowledge-search.service';
import type { KnowledgeSettingsService } from '../knowledge-settings.service';
import type {
	KnowledgeVectorHit,
	KnowledgeVectorStoreService,
} from '../knowledge-vector-store.service';
import { KnowledgeConfig } from '../knowledge.config';

const knowledgeSource = (id: string, name: string) => mock<KnowledgeSource>({ id, name });

const hit = (overrides: Partial<KnowledgeVectorHit> = {}): KnowledgeVectorHit => ({
	id: 'point-1',
	score: 0.87,
	payload: {
		sourceId: 'source-1',
		documentId: 'doc-1',
		externalId: 'issue:1',
		chunkIndex: 2,
		title: 'First issue',
		url: 'https://example.com/issue/1',
		text: 'Some indexable content.',
		author: 'alice',
		number: 1,
	},
	...overrides,
});

describe('KnowledgeSearchService', () => {
	const settingsService = mock<KnowledgeSettingsService>();
	const sourceRepository = mock<KnowledgeSourceRepository>();
	const embeddingService = mock<KnowledgeEmbeddingService>();
	const vectorStoreService = mock<KnowledgeVectorStoreService>();

	let service: KnowledgeSearchService;

	beforeEach(() => {
		vi.clearAllMocks();
		settingsService.isConfigured.mockResolvedValue(true);
		sourceRepository.findAllSources.mockResolvedValue([
			knowledgeSource('source-1', 'Docs'),
			knowledgeSource('source-2', 'Issues'),
		]);
		embeddingService.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);
		vectorStoreService.search.mockResolvedValue([]);

		service = new KnowledgeSearchService(
			settingsService,
			sourceRepository,
			embeddingService,
			vectorStoreService,
			new KnowledgeConfig(),
		);
	});

	test('throws when the module is not configured', async () => {
		settingsService.isConfigured.mockResolvedValue(false);

		await expect(service.search('anything')).rejects.toThrow(KnowledgeNotConfiguredError);
		expect(embeddingService.embedQuery).not.toHaveBeenCalled();
	});

	test('returns nothing for a blank query', async () => {
		await expect(service.search('   ')).resolves.toEqual([]);

		expect(embeddingService.embedQuery).not.toHaveBeenCalled();
		expect(vectorStoreService.search).not.toHaveBeenCalled();
	});

	describe('source scoping', () => {
		test('searches every existing source by default', async () => {
			await service.search('how do I deploy?');

			expect(vectorStoreService.search).toHaveBeenCalledWith([0.1, 0.2, 0.3], {
				sourceIds: ['source-1', 'source-2'],
				topK: 8,
			});
		});

		test('intersects pinned source ids with the existing ones', async () => {
			await service.search('how do I deploy?', { sourceIds: ['source-2', 'source-gone'] });

			expect(vectorStoreService.search).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ sourceIds: ['source-2'] }),
			);
		});

		test('returns nothing when the intersection is empty', async () => {
			await expect(service.search('query', { sourceIds: ['source-gone'] })).resolves.toEqual([]);

			expect(embeddingService.embedQuery).not.toHaveBeenCalled();
			expect(vectorStoreService.search).not.toHaveBeenCalled();
		});

		test('returns nothing when no source exists at all', async () => {
			sourceRepository.findAllSources.mockResolvedValue([]);

			await expect(service.search('query')).resolves.toEqual([]);
			expect(vectorStoreService.search).not.toHaveBeenCalled();
		});
	});

	describe('topK', () => {
		test('falls back to the configured default', async () => {
			await service.search('query');

			expect(vectorStoreService.search).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ topK: 8 }),
			);
		});

		test('uses the caller-provided value', async () => {
			await service.search('query', { topK: 3 });

			expect(vectorStoreService.search).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ topK: 3 }),
			);
		});
	});

	describe('result mapping', () => {
		test('splits the payload into result fields and leftover metadata', async () => {
			vectorStoreService.search.mockResolvedValue([hit()]);

			await expect(service.search('query')).resolves.toEqual([
				{
					text: 'Some indexable content.',
					score: 0.87,
					title: 'First issue',
					url: 'https://example.com/issue/1',
					sourceId: 'source-1',
					sourceName: 'Docs',
					externalId: 'issue:1',
					metadata: { externalId: 'issue:1', author: 'alice', number: 1 },
				},
			]);
		});

		test('leaves url null when the chunk has none', async () => {
			vectorStoreService.search.mockResolvedValue([
				hit({ payload: { ...hit().payload, url: null } }),
			]);

			const [result] = await service.search('query');

			expect(result.url).toBeNull();
		});

		test('resolves the source name from the fetched sources', async () => {
			vectorStoreService.search.mockResolvedValue([
				hit({ payload: { ...hit().payload, sourceId: 'source-2' } }),
			]);

			const [result] = await service.search('query');

			expect(result.sourceName).toBe('Issues');
		});

		test('drops a hit whose source no longer exists', async () => {
			vectorStoreService.search.mockResolvedValue([
				hit(),
				hit({ id: 'point-2', payload: { ...hit().payload, sourceId: 'source-deleted' } }),
			]);

			const results = await service.search('query');

			expect(results).toHaveLength(1);
			expect(results[0].sourceId).toBe('source-1');
		});

		test('tolerates a payload missing the optional fields', async () => {
			vectorStoreService.search.mockResolvedValue([
				{ id: 'point-1', score: 0.5, payload: { sourceId: 'source-1' } },
			]);

			await expect(service.search('query')).resolves.toEqual([
				{
					text: '',
					score: 0.5,
					title: '',
					url: null,
					sourceId: 'source-1',
					sourceName: 'Docs',
					externalId: '',
					metadata: {},
				},
			]);
		});
	});
});
