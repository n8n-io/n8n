import type { Logger } from '@n8n/backend-common';
import { createHash } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import type { KnowledgeDocumentDraft } from '../connectors/connector.types';
import type { KnowledgeDocument, KnowledgeSource } from '../database/entities';
import type { KnowledgeDocumentRepository } from '../database/repositories';
import type { KnowledgeEmbeddingService } from '../knowledge-embedding.service';
import { KnowledgeIndexingService } from '../knowledge-indexing.service';
import type { KnowledgeVectorStoreService } from '../knowledge-vector-store.service';
import { KnowledgeConfig } from '../knowledge.config';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const source = mock<KnowledgeSource>({ id: 'source-1', name: 'Docs', type: 'github' });

const draft = (overrides: Partial<KnowledgeDocumentDraft> = {}): KnowledgeDocumentDraft => ({
	externalId: 'issue:1',
	title: 'First issue',
	url: 'https://example.com/issue/1',
	text: 'Some indexable content.',
	metadata: { author: 'alice', number: 1 },
	...overrides,
});

const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

const documentRow = (overrides: Partial<KnowledgeDocument> = {}) =>
	mock<KnowledgeDocument>({
		id: 'doc-1',
		sourceId: 'source-1',
		externalId: 'issue:1',
		contentHash: 'stale',
		chunkCount: 0,
		...overrides,
	});

describe('KnowledgeIndexingService', () => {
	const documentRepository = mock<KnowledgeDocumentRepository>();
	const embeddingService = mock<KnowledgeEmbeddingService>();
	const vectorStoreService = mock<KnowledgeVectorStoreService>();
	const logger = mock<Logger>();

	let service: KnowledgeIndexingService;

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		documentRepository.findBySourceAndExternalId.mockResolvedValue(null);
		documentRepository.upsertDocument.mockResolvedValue(documentRow());
		embeddingService.getDimension.mockResolvedValue(3);
		embeddingService.embedMany.mockImplementation(async (texts) => texts.map((_, i) => [i, i, i]));

		service = new KnowledgeIndexingService(
			documentRepository,
			embeddingService,
			vectorStoreService,
			new KnowledgeConfig(),
			logger,
		);
	});

	describe('skip by hash', () => {
		test('skips when the indexed content hash still matches', async () => {
			const unchanged = draft();
			documentRepository.findBySourceAndExternalId.mockResolvedValue(
				documentRow({ contentHash: sha256(unchanged.text), chunkCount: 2 }),
			);

			await expect(service.indexDocument(source, unchanged)).resolves.toBe('skipped');

			expect(embeddingService.embedMany).not.toHaveBeenCalled();
			expect(vectorStoreService.upsertChunks).not.toHaveBeenCalled();
			expect(documentRepository.upsertDocument).not.toHaveBeenCalled();
		});

		test('indexes when the content hash differs', async () => {
			documentRepository.findBySourceAndExternalId.mockResolvedValue(
				documentRow({ contentHash: sha256('older content'), chunkCount: 1 }),
			);

			await expect(service.indexDocument(source, draft())).resolves.toBe('indexed');

			expect(vectorStoreService.upsertChunks).toHaveBeenCalled();
		});
	});

	describe('indexing a new document', () => {
		test('writes the row before the vectors and finalizes the hash after', async () => {
			await expect(service.indexDocument(source, draft())).resolves.toBe('indexed');

			const [placeholder, finalized] = documentRepository.upsertDocument.mock.calls.map(
				([args]) => args,
			);
			expect(placeholder).toMatchObject({ contentHash: 'pending', chunkCount: 0 });
			expect(finalized).toMatchObject({
				sourceId: 'source-1',
				externalId: 'issue:1',
				title: 'First issue',
				url: 'https://example.com/issue/1',
				contentHash: sha256(draft().text),
				chunkCount: 1,
				meta: { author: 'alice', number: 1 },
			});
			expect(vectorStoreService.upsertChunks.mock.invocationCallOrder[0]).toBeLessThan(
				documentRepository.upsertDocument.mock.invocationCallOrder[1],
			);
		});

		test('ensures the collection with the embedding dimension first', async () => {
			await service.indexDocument(source, draft());

			expect(vectorStoreService.ensureCollection).toHaveBeenCalledWith(3);
			expect(vectorStoreService.ensureCollection.mock.invocationCallOrder[0]).toBeLessThan(
				embeddingService.embedMany.mock.invocationCallOrder[0],
			);
		});

		test('does not delete vectors when there is nothing to replace', async () => {
			await service.indexDocument(source, draft());

			expect(vectorStoreService.deleteByDocumentId).not.toHaveBeenCalled();
		});

		test('builds one point per chunk with a uuid id and the matching vector', async () => {
			const config = new KnowledgeConfig();
			config.chunkSize = 10;
			config.chunkOverlap = 0;
			service = new KnowledgeIndexingService(
				documentRepository,
				embeddingService,
				vectorStoreService,
				config,
				logger,
			);

			await service.indexDocument(source, draft({ text: 'alpha beta gamma delta' }));

			const [points] = vectorStoreService.upsertChunks.mock.calls[0];
			expect(points).toHaveLength(3);
			expect(points.map((point) => point.vector)).toEqual([
				[0, 0, 0],
				[1, 1, 1],
				[2, 2, 2],
			]);
			expect(points.map((point) => point.payload.chunkIndex)).toEqual([0, 1, 2]);
			for (const point of points) expect(point.id).toMatch(UUID_PATTERN);
			expect(new Set(points.map((point) => point.id)).size).toBe(3);
		});
	});

	describe('chunk payload', () => {
		const payloadOf = async (documentDraft: KnowledgeDocumentDraft) => {
			await service.indexDocument(source, documentDraft);
			const [points] = vectorStoreService.upsertChunks.mock.calls[0];
			return points[0].payload;
		};

		test('carries the reserved fields plus the connector metadata', async () => {
			await expect(payloadOf(draft())).resolves.toEqual({
				author: 'alice',
				number: 1,
				sourceId: 'source-1',
				documentId: 'doc-1',
				externalId: 'issue:1',
				chunkIndex: 0,
				title: 'First issue',
				url: 'https://example.com/issue/1',
				text: 'Some indexable content.',
			});
		});

		test('reserved keys win over connector metadata', async () => {
			const payload = await payloadOf(
				draft({
					metadata: {
						sourceId: 'spoofed-source',
						documentId: 'spoofed-doc',
						externalId: 'spoofed-external',
						title: 'spoofed title',
						url: 'https://spoofed.example.com',
						text: 'spoofed text',
						chunkIndex: 99,
						safe: 'kept',
					},
				}),
			);

			expect(payload).toEqual({
				safe: 'kept',
				sourceId: 'source-1',
				documentId: 'doc-1',
				externalId: 'issue:1',
				chunkIndex: 0,
				title: 'First issue',
				url: 'https://example.com/issue/1',
				text: 'Some indexable content.',
			});
		});

		test('stores a missing url as null', async () => {
			const payload = await payloadOf(draft({ url: undefined }));

			expect(payload.url).toBeNull();
		});
	});

	describe('re-indexing', () => {
		beforeEach(() => {
			documentRepository.findBySourceAndExternalId.mockResolvedValue(
				documentRow({ contentHash: sha256('older content'), chunkCount: 4 }),
			);
		});

		test('deletes the previous vectors before writing the new ones', async () => {
			await service.indexDocument(source, draft());

			expect(vectorStoreService.deleteByDocumentId).toHaveBeenCalledWith('source-1', 'doc-1');
			expect(vectorStoreService.deleteByDocumentId.mock.invocationCallOrder[0]).toBeLessThan(
				vectorStoreService.upsertChunks.mock.invocationCallOrder[0],
			);
		});

		test('drops the vectors of a document that lost all its content', async () => {
			await expect(service.indexDocument(source, draft({ text: '   ' }))).resolves.toBe('indexed');

			expect(vectorStoreService.deleteByDocumentId).toHaveBeenCalledWith('source-1', 'doc-1');
			expect(vectorStoreService.upsertChunks).not.toHaveBeenCalled();
			expect(documentRepository.upsertDocument).toHaveBeenLastCalledWith(
				expect.objectContaining({ chunkCount: 0, contentHash: sha256('   ') }),
			);
		});

		test('sweeps vectors an interrupted run may have left behind', async () => {
			// `chunkCount` is still 0 because the previous run never got to write
			// the final row, but its vectors may already be in the store.
			documentRepository.findBySourceAndExternalId.mockResolvedValue(
				documentRow({ contentHash: 'pending', chunkCount: 0 }),
			);

			await service.indexDocument(source, draft());

			expect(vectorStoreService.deleteByDocumentId).toHaveBeenCalledWith('source-1', 'doc-1');
		});
	});

	describe('a document with no chunkable content', () => {
		test('records the row without touching the vector store', async () => {
			await expect(service.indexDocument(source, draft({ text: '\n\n' }))).resolves.toBe('indexed');

			expect(vectorStoreService.ensureCollection).not.toHaveBeenCalled();
			expect(vectorStoreService.upsertChunks).not.toHaveBeenCalled();
			expect(documentRepository.upsertDocument).toHaveBeenLastCalledWith(
				expect.objectContaining({ chunkCount: 0 }),
			);
		});
	});

	describe('removeDocuments', () => {
		test('deletes the vectors before the rows', async () => {
			documentRepository.deleteBySourceAndExternalIds.mockResolvedValue(2);

			await expect(service.removeDocuments(source, ['issue:1', 'issue:2'])).resolves.toBe(2);

			expect(vectorStoreService.deleteByExternalIds).toHaveBeenCalledWith('source-1', [
				'issue:1',
				'issue:2',
			]);
			expect(documentRepository.deleteBySourceAndExternalIds).toHaveBeenCalledWith('source-1', [
				'issue:1',
				'issue:2',
			]);
			expect(vectorStoreService.deleteByExternalIds.mock.invocationCallOrder[0]).toBeLessThan(
				documentRepository.deleteBySourceAndExternalIds.mock.invocationCallOrder[0],
			);
		});

		test('does nothing for an empty list', async () => {
			await expect(service.removeDocuments(source, [])).resolves.toBe(0);

			expect(vectorStoreService.deleteByExternalIds).not.toHaveBeenCalled();
			expect(documentRepository.deleteBySourceAndExternalIds).not.toHaveBeenCalled();
		});
	});

	describe('removeSource', () => {
		test('drops every vector and every document row of the source', async () => {
			documentRepository.listExternalIds.mockResolvedValue(['issue:1', 'issue:2']);

			await service.removeSource('source-1');

			expect(vectorStoreService.deleteBySourceId).toHaveBeenCalledWith('source-1');
			expect(documentRepository.deleteBySourceAndExternalIds).toHaveBeenCalledWith('source-1', [
				'issue:1',
				'issue:2',
			]);
		});
	});
});
