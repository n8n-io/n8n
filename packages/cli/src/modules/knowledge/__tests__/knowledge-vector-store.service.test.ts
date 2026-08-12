import type { CredentialsEntity, CredentialsRepository } from '@n8n/db';
import { QdrantClient } from '@qdrant/js-client-rest';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import { KnowledgeNotConfiguredError } from '../errors';
import type { KnowledgeSettings, KnowledgeSettingsService } from '../knowledge-settings.service';
import { KnowledgeVectorStoreService } from '../knowledge-vector-store.service';

const client = {
	collectionExists: vi.fn(),
	createCollection: vi.fn(),
	getCollection: vi.fn(),
	createPayloadIndex: vi.fn(),
	upsert: vi.fn(),
	delete: vi.fn(),
	query: vi.fn(),
};

// A function expression, not an arrow: the service calls `new QdrantClient(...)`.
vi.mock('@qdrant/js-client-rest', () => ({
	QdrantClient: vi.fn(function () {
		return client;
	}),
}));

const COLLECTION = 'n8n_knowledge';

const settings = (overrides: Partial<KnowledgeSettings> = {}): KnowledgeSettings => ({
	embedding: { provider: 'openai', credentialId: 'cred-1', model: 'text-embedding-3-small' },
	vectorStore: { provider: 'qdrant', credentialId: 'cred-2', collectionName: COLLECTION },
	...overrides,
});

const collectionInfo = (size: number) => ({ config: { params: { vectors: { size } } } });

describe('KnowledgeVectorStoreService', () => {
	const settingsService = mock<KnowledgeSettingsService>();
	const credentialsRepository = mock<CredentialsRepository>();
	const credentialsService = mock<CredentialsService>();
	const credential = mock<CredentialsEntity>({ id: 'cred-2', type: 'qdrantApi' });

	let service: KnowledgeVectorStoreService;

	beforeEach(() => {
		vi.clearAllMocks();
		settingsService.getSettings.mockResolvedValue(settings());
		credentialsRepository.findOneBy.mockResolvedValue(credential);
		credentialsService.decrypt.mockResolvedValue({
			qdrantUrl: 'https://qdrant.example.com',
			apiKey: 'qdrant-key',
		});
		client.collectionExists.mockResolvedValue({ exists: true });
		client.getCollection.mockResolvedValue(collectionInfo(3));
		client.query.mockResolvedValue({ points: [] });

		service = new KnowledgeVectorStoreService(
			settingsService,
			credentialsRepository,
			credentialsService,
		);
	});

	describe('client construction', () => {
		test('builds the client from the configured credential', async () => {
			await service.ensureCollection(3);

			expect(credentialsRepository.findOneBy).toHaveBeenCalledWith({ id: 'cred-2' });
			expect(credentialsService.decrypt).toHaveBeenCalledWith(credential, true);
			expect(QdrantClient).toHaveBeenCalledWith({
				url: 'https://qdrant.example.com',
				apiKey: 'qdrant-key',
			});
		});

		test('omits the API key when the credential has none', async () => {
			credentialsService.decrypt.mockResolvedValue({ qdrantUrl: 'http://localhost:6333' });

			await service.ensureCollection(3);

			expect(QdrantClient).toHaveBeenCalledWith({ url: 'http://localhost:6333' });
		});

		test('reuses the client across calls', async () => {
			await service.ensureCollection(3);
			await service.search([1, 2, 3], { sourceIds: ['source-1'], topK: 4 });

			expect(QdrantClient).toHaveBeenCalledTimes(1);
		});

		test('rebuilds when the configured collection changes', async () => {
			await service.ensureCollection(3);

			settingsService.getSettings.mockResolvedValue(
				settings({
					vectorStore: { provider: 'qdrant', credentialId: 'cred-2', collectionName: 'other' },
				}),
			);
			await service.ensureCollection(3);

			expect(QdrantClient).toHaveBeenCalledTimes(2);
			expect(client.collectionExists).toHaveBeenLastCalledWith('other');
		});

		test('throws when the vector store is not configured', async () => {
			settingsService.getSettings.mockResolvedValue(settings({ vectorStore: null }));

			await expect(service.ensureCollection(3)).rejects.toThrow(KnowledgeNotConfiguredError);
		});

		test('throws when the configured credential no longer exists', async () => {
			credentialsRepository.findOneBy.mockResolvedValue(null);

			await expect(service.ensureCollection(3)).rejects.toThrow('no longer exists');
		});

		test('throws when the credential has no URL', async () => {
			credentialsService.decrypt.mockResolvedValue({ apiKey: 'qdrant-key' });

			await expect(service.ensureCollection(3)).rejects.toThrow('no URL');
		});
	});

	describe('ensureCollection', () => {
		test('creates the collection when it is missing', async () => {
			client.collectionExists.mockResolvedValue({ exists: false });

			await service.ensureCollection(1536);

			expect(client.createCollection).toHaveBeenCalledWith(COLLECTION, {
				vectors: { size: 1536, distance: 'Cosine' },
			});
		});

		test('creates keyword payload indexes for every filtered field', async () => {
			await service.ensureCollection(3);

			expect(client.createPayloadIndex.mock.calls.map(([, args]) => args)).toEqual([
				{ field_name: 'sourceId', field_schema: 'keyword', wait: true },
				{ field_name: 'documentId', field_schema: 'keyword', wait: true },
				{ field_name: 'externalId', field_schema: 'keyword', wait: true },
			]);
		});

		test('does not recreate an existing collection', async () => {
			await service.ensureCollection(3);

			expect(client.createCollection).not.toHaveBeenCalled();
		});

		test('is a no-op on repeat calls for the same dimension', async () => {
			await service.ensureCollection(3);
			await service.ensureCollection(3);

			expect(client.collectionExists).toHaveBeenCalledTimes(1);
			expect(client.createPayloadIndex).toHaveBeenCalledTimes(3);
		});

		test('throws a user error when the collection has a different vector size', async () => {
			client.getCollection.mockResolvedValue(collectionInfo(768));

			await expect(service.ensureCollection(1536)).rejects.toThrow(
				/stores 768-dimensional vectors but the configured embedding model produces 1536/,
			);
			expect(client.createPayloadIndex).not.toHaveBeenCalled();
		});

		test('reads the vector size of a named-vector collection', async () => {
			client.getCollection.mockResolvedValue({
				config: { params: { vectors: { dense: { size: 768 } } } },
			});

			await expect(service.ensureCollection(1536)).rejects.toThrow('stores 768-dimensional');
		});

		test('tolerates a collection created concurrently', async () => {
			client.collectionExists.mockResolvedValueOnce({ exists: false });
			client.createCollection.mockRejectedValue(new Error('Conflict'));
			client.collectionExists.mockResolvedValueOnce({ exists: true });

			await expect(service.ensureCollection(3)).resolves.toBeUndefined();
			expect(client.getCollection).toHaveBeenCalledWith(COLLECTION);
		});

		test('rethrows when the collection is still missing after a failed create', async () => {
			client.collectionExists.mockResolvedValue({ exists: false });
			client.createCollection.mockRejectedValue(new Error('Unauthorized'));

			await expect(service.ensureCollection(3)).rejects.toThrow('Unauthorized');
		});
	});

	describe('upsertChunks', () => {
		const point = (id: string) => ({ id, vector: [1, 2, 3], payload: { sourceId: 'source-1' } });

		test('does nothing for an empty list', async () => {
			await service.upsertChunks([]);

			expect(client.upsert).not.toHaveBeenCalled();
		});

		test('upserts in a single batch and waits for the write', async () => {
			const points = [point('a'), point('b')];

			await service.upsertChunks(points);

			expect(client.upsert).toHaveBeenCalledTimes(1);
			expect(client.upsert).toHaveBeenCalledWith(COLLECTION, { wait: true, points });
		});

		test('splits large writes into batches of 200', async () => {
			const points = Array.from({ length: 450 }, (_, index) => point(`p-${index}`));

			await service.upsertChunks(points);

			expect(client.upsert).toHaveBeenCalledTimes(3);
			expect(client.upsert.mock.calls.map(([, args]) => args.points.length)).toEqual([
				200, 200, 50,
			]);
		});
	});

	describe('deletes', () => {
		test('deleteByDocumentId filters on the source and the document', async () => {
			await service.deleteByDocumentId('source-1', 'doc-1');

			expect(client.delete).toHaveBeenCalledWith(COLLECTION, {
				wait: true,
				filter: {
					must: [
						{ key: 'sourceId', match: { value: 'source-1' } },
						{ key: 'documentId', match: { value: 'doc-1' } },
					],
				},
			});
		});

		test('deleteBySourceId filters on the source only', async () => {
			await service.deleteBySourceId('source-1');

			expect(client.delete).toHaveBeenCalledWith(COLLECTION, {
				wait: true,
				filter: { must: [{ key: 'sourceId', match: { value: 'source-1' } }] },
			});
		});

		test('deleteByExternalIds keeps the delete scoped to the source', async () => {
			await service.deleteByExternalIds('source-1', ['issue:1', 'issue:2']);

			expect(client.delete).toHaveBeenCalledWith(COLLECTION, {
				wait: true,
				filter: {
					must: [
						{ key: 'sourceId', match: { value: 'source-1' } },
						// eslint-disable-next-line id-denylist -- Qdrant's match-schema field name
						{ key: 'externalId', match: { any: ['issue:1', 'issue:2'] } },
					],
				},
			});
		});

		test('deleteByExternalIds does nothing for an empty list', async () => {
			await service.deleteByExternalIds('source-1', []);

			expect(client.delete).not.toHaveBeenCalled();
		});
	});

	describe('search', () => {
		test('always scopes the query to the given source ids', async () => {
			await service.search([0.1, 0.2], { sourceIds: ['source-1', 'source-2'], topK: 5 });

			expect(client.query).toHaveBeenCalledWith(COLLECTION, {
				query: [0.1, 0.2],
				limit: 5,
				with_payload: true,
				filter: {
					// eslint-disable-next-line id-denylist -- Qdrant's match-schema field name
					must: [{ key: 'sourceId', match: { any: ['source-1', 'source-2'] } }],
				},
			});
		});

		test('returns no hits and queries nothing when no source is allowed', async () => {
			await expect(service.search([0.1], { sourceIds: [], topK: 5 })).resolves.toEqual([]);

			expect(client.query).not.toHaveBeenCalled();
		});

		test('maps the returned points', async () => {
			client.query.mockResolvedValue({
				points: [
					{ id: 'point-1', score: 0.92, payload: { text: 'hello', sourceId: 'source-1' } },
					{ id: 7, score: 0.4, payload: null },
				],
			});

			await expect(service.search([0.1], { sourceIds: ['source-1'], topK: 2 })).resolves.toEqual([
				{ id: 'point-1', score: 0.92, payload: { text: 'hello', sourceId: 'source-1' } },
				{ id: '7', score: 0.4, payload: {} },
			]);
		});
	});
});
