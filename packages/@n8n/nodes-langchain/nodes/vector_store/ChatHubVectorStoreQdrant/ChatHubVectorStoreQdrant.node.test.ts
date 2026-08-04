// Capture the deleteDocuments action handler from createVectorStoreNode config

vi.mock('@langchain/qdrant', () => {
	class QdrantVectorStore {
		static fromDocuments = vi.fn();
		static fromExistingCollection = vi.fn();
		similaritySearch = vi.fn();
		similaritySearchWithScore = vi.fn();
		similaritySearchVectorWithScore = vi.fn();
	}
	return { QdrantVectorStore };
});

vi.mock('@n8n/ai-utilities', () => ({
	createVectorStoreNode: (config: any) => {
		// @ts-expect-error - Mocking
		globalThis.capturedDeleteDocuments = config.methods?.actionHandler?.deleteDocuments;
		return class BaseNode {
			async getVectorStoreClient(...args: unknown[]) {
				return await config.getVectorStoreClient.apply(config, args);
			}
			async populateVectorStore(...args: unknown[]) {
				return await config.populateVectorStore.apply(config, args);
			}
		};
	},
	metadataFilterField: {},
}));

vi.mock('../VectorStoreQdrant/Qdrant.utils', () => ({
	createQdrantClient: vi.fn(),
}));

import { QdrantVectorStore } from '@langchain/qdrant';

import { ChatHubVectorStoreQdrant } from './ChatHubVectorStoreQdrant.node';
import { createQdrantClient } from '../VectorStoreQdrant/Qdrant.utils';
import type { MockedClass, MockedFunction } from 'vitest';

const MockQdrantVectorStore = QdrantVectorStore as MockedClass<typeof QdrantVectorStore>;
const MockCreateQdrantClient = createQdrantClient as MockedFunction<typeof createQdrantClient>;

describe('ChatHubVectorStoreQdrant', () => {
	const mockClient = {
		createPayloadIndex: vi.fn(),
		delete: vi.fn(),
	};

	const credentials = {
		qdrantUrl: 'https://localhost:6333',
		apiKey: 'test-api-key',
		collectionName: 'chat_hub',
	};

	const mockNode = { name: 'ChatHubVectorStoreQdrant' } as any;
	const mockLogger = {
		debug: vi.fn(),
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		verbose: vi.fn(),
	} as any;

	function makeContext(userId: string) {
		return {
			additionalData: { userId },
			getCredentials: vi.fn().mockResolvedValue(credentials),
			getNode: vi.fn().mockReturnValue(mockNode),
			logger: mockLogger,
		} as any;
	}

	beforeEach(() => {
		vi.resetAllMocks();
		MockCreateQdrantClient.mockReturnValue(mockClient as any);
		mockClient.createPayloadIndex.mockResolvedValue(undefined);
	});

	describe('getVectorStoreClient', () => {
		it('should filter metadata in similaritySearch results to loc.* and fileName only', async () => {
			const doc = {
				pageContent: 'content',
				metadata: {
					fileName: 'file.pdf',
					'loc.pageNumber': 3,
					'loc.lines.from': 10,
					agentId: 'agent-1',
					fileKnowledgeId: 'k1',
					userId: 'user-123',
				},
			};
			MockQdrantVectorStore.fromExistingCollection = vi.fn().mockResolvedValue({
				similaritySearch: vi.fn().mockResolvedValue([doc]),
				similaritySearchWithScore: vi.fn().mockResolvedValue([]),
				similaritySearchVectorWithScore: vi.fn().mockResolvedValue([]),
			});

			const node = new ChatHubVectorStoreQdrant();
			const store = await (node as any).getVectorStoreClient(
				makeContext('user-123'),
				undefined,
				{},
			);
			const results = await store.similaritySearch('query');

			expect(results[0].metadata).toEqual({
				fileName: 'file.pdf',
				'loc.pageNumber': 3,
				'loc.lines.from': 10,
			});
		});

		it('should filter metadata in similaritySearchWithScore results to loc.* and fileName only', async () => {
			const doc = {
				pageContent: 'content',
				metadata: {
					fileName: 'file.pdf',
					'loc.pageNumber': 2,
					agentId: 'agent-1',
					fileKnowledgeId: 'k1',
					userId: 'user-123',
				},
			};
			MockQdrantVectorStore.fromExistingCollection = vi.fn().mockResolvedValue({
				similaritySearch: vi.fn().mockResolvedValue([]),
				similaritySearchWithScore: vi.fn().mockResolvedValue([[doc, 0.9]]),
				similaritySearchVectorWithScore: vi.fn().mockResolvedValue([]),
			});

			const node = new ChatHubVectorStoreQdrant();
			const store = await (node as any).getVectorStoreClient(
				makeContext('user-123'),
				undefined,
				{},
			);
			const results = await store.similaritySearchWithScore('query');

			expect(results[0][0].metadata).toEqual({ fileName: 'file.pdf', 'loc.pageNumber': 2 });
			expect(results[0][1]).toBe(0.9);
		});

		it('should filter metadata in similaritySearchVectorWithScore results to loc.* and fileName only', async () => {
			const doc = {
				pageContent: 'content',
				metadata: {
					fileName: 'file.pdf',
					'loc.pageNumber': 5,
					agentId: 'agent-1',
					fileKnowledgeId: 'k1',
					userId: 'user-123',
				},
			};
			MockQdrantVectorStore.fromExistingCollection = vi.fn().mockResolvedValue({
				similaritySearch: vi.fn().mockResolvedValue([]),
				similaritySearchWithScore: vi.fn().mockResolvedValue([]),
				similaritySearchVectorWithScore: vi.fn().mockResolvedValue([[doc, 0.8]]),
			});

			const node = new ChatHubVectorStoreQdrant();
			const store = await (node as any).getVectorStoreClient(
				makeContext('user-123'),
				undefined,
				{},
			);
			const results = await store.similaritySearchVectorWithScore([0.1, 0.2]);

			expect(results[0][0].metadata).toEqual({ fileName: 'file.pdf', 'loc.pageNumber': 5 });
			expect(results[0][1]).toBe(0.8);
		});

		it('should inject userId into similaritySearch', async () => {
			const originalSearch = vi.fn().mockResolvedValue([]);
			MockQdrantVectorStore.fromExistingCollection = vi.fn().mockResolvedValue({
				similaritySearch: originalSearch,
				similaritySearchWithScore: vi.fn().mockResolvedValue([]),
				similaritySearchVectorWithScore: vi.fn().mockResolvedValue([]),
			});

			const node = new ChatHubVectorStoreQdrant();
			const store = await (node as any).getVectorStoreClient(
				makeContext('user-abc-123'),
				undefined,
				{},
			);

			await store.similaritySearch('my query', 5);

			expect(originalSearch).toHaveBeenCalledWith(
				'my query',
				5,
				expect.objectContaining({
					must: expect.arrayContaining([
						{ key: 'metadata.userId', match: { value: 'user-abc-123' } },
					]),
				}),
				undefined,
			);
		});

		it('should convert flat anotherFilter into Qdrant must conditions (retrieve-as-tool path)', async () => {
			const originalSearchVectorWithScore = vi.fn().mockResolvedValue([]);
			MockQdrantVectorStore.fromExistingCollection = vi.fn().mockResolvedValue({
				similaritySearch: vi.fn().mockResolvedValue([]),
				similaritySearchWithScore: vi.fn().mockResolvedValue([]),
				similaritySearchVectorWithScore: originalSearchVectorWithScore,
			});

			const node = new ChatHubVectorStoreQdrant();
			const store = await (node as any).getVectorStoreClient(
				makeContext('user-123'),
				undefined,
				{},
			);

			await store.similaritySearchVectorWithScore([0.1, 0.2], 4, { agentId: 'agent-1' });

			expect(originalSearchVectorWithScore).toHaveBeenCalledWith(
				[0.1, 0.2],
				4,
				expect.objectContaining({
					must: expect.arrayContaining([
						{ key: 'metadata.agentId', match: { value: 'agent-1' } },
						{ key: 'metadata.userId', match: { value: 'user-123' } },
					]),
				}),
			);
		});
	});

	describe('populateVectorStore', () => {
		it('should add userId to every document before insertion', async () => {
			MockQdrantVectorStore.fromDocuments = vi.fn().mockResolvedValue(undefined);

			const documents = [
				{ pageContent: 'doc1', metadata: { agentId: 'agent-1', fileKnowledgeId: 'k1' } },
				{ pageContent: 'doc2', metadata: { agentId: 'agent-1', fileKnowledgeId: 'k2' } },
			];

			const node = new ChatHubVectorStoreQdrant();
			await (node as any).populateVectorStore(makeContext('user-456'), {}, documents);

			expect(MockQdrantVectorStore.fromDocuments).toHaveBeenCalledWith(
				[
					{
						pageContent: 'doc1',
						metadata: { agentId: 'agent-1', fileKnowledgeId: 'k1', userId: 'user-456' },
					},
					{
						pageContent: 'doc2',
						metadata: { agentId: 'agent-1', fileKnowledgeId: 'k2', userId: 'user-456' },
					},
				],
				{},
				expect.any(Object),
			);
		});

		it('should strip metadata fields not in the allowed insert set', async () => {
			MockQdrantVectorStore.fromDocuments = vi.fn().mockResolvedValue(undefined);

			const documents = [
				{
					pageContent: 'doc1',
					metadata: {
						fileName: 'file.pdf',
						agentId: 'agent-1',
						fileKnowledgeId: 'k1',
						loc: { pageNumber: 1 },
						source: '/tmp/file.pdf',
						pdf: { version: '1.4' },
					},
				},
			];

			const node = new ChatHubVectorStoreQdrant();
			await (node as any).populateVectorStore(makeContext('user-456'), {}, documents);

			expect(MockQdrantVectorStore.fromDocuments).toHaveBeenCalledWith(
				[
					{
						pageContent: 'doc1',
						metadata: {
							fileName: 'file.pdf',
							agentId: 'agent-1',
							fileKnowledgeId: 'k1',
							loc: { pageNumber: 1 },
							userId: 'user-456',
						},
					},
				],
				{},
				expect.any(Object),
			);
		});
	});

	describe('deleteDocuments', () => {
		it('should always prepend userId to the delete filter', async () => {
			mockClient.delete.mockResolvedValue(undefined);

			// @ts-expect-error - Mocking
			await globalThis.capturedDeleteDocuments.call(makeContext('user-789'), {
				filter: { agentId: 'agent-1' },
			});

			expect(mockClient.delete).toHaveBeenCalledWith('chat_hub', {
				filter: {
					must: expect.arrayContaining([
						{ key: 'metadata.userId', match: { value: 'user-789' } },
						{ key: 'metadata.agentId', match: { value: 'agent-1' } },
					]),
				},
			});
		});

		it('should delete all user documents when filter is empty', async () => {
			mockClient.delete.mockResolvedValue(undefined);

			// @ts-expect-error - Mocking
			await globalThis.capturedDeleteDocuments.call(makeContext('user-789'), { filter: {} });

			expect(mockClient.delete).toHaveBeenCalledWith('chat_hub', {
				filter: {
					must: [{ key: 'metadata.userId', match: { value: 'user-789' } }],
				},
			});
		});
	});
});
