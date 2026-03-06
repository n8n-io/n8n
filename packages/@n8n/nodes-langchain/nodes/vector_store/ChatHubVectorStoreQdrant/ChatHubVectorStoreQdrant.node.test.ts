// Capture the deleteDocuments action handler from createVectorStoreNode config
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedDeleteDocuments!: (this: any, payload: any) => Promise<unknown>;

jest.mock('@langchain/qdrant', () => {
	class QdrantVectorStore {
		static fromDocuments = jest.fn();
		static fromExistingCollection = jest.fn();
		similaritySearch = jest.fn();
		similaritySearchWithScore = jest.fn();
		similaritySearchVectorWithScore = jest.fn();
	}
	return { QdrantVectorStore };
});

jest.mock('@n8n/ai-utilities', () => ({
	createVectorStoreNode: (config: any) => {
		capturedDeleteDocuments = config.methods?.actionHandler?.deleteDocuments;
		return class BaseNode {
			async getVectorStoreClient(...args: unknown[]) {
				return await config.getVectorStoreClient(...args);
			}
			async populateVectorStore(...args: unknown[]) {
				return await config.populateVectorStore(...args);
			}
		};
	},
}));

jest.mock('../VectorStoreQdrant/Qdrant.utils', () => ({
	createQdrantClient: jest.fn(),
}));

import { QdrantVectorStore } from '@langchain/qdrant';
import { createQdrantClient } from '../VectorStoreQdrant/Qdrant.utils';
import { ChatHubVectorStoreQdrant } from './ChatHubVectorStoreQdrant.node';

const MockQdrantVectorStore = QdrantVectorStore as jest.MockedClass<typeof QdrantVectorStore>;
const MockCreateQdrantClient = createQdrantClient as jest.MockedFunction<typeof createQdrantClient>;

describe('ChatHubVectorStoreQdrant', () => {
	const mockClient = {
		createPayloadIndex: jest.fn(),
		delete: jest.fn(),
	};

	const credentials = {
		qdrantUrl: 'https://localhost:6333',
		apiKey: 'test-api-key',
		collectionName: 'chat_hub',
	};

	const mockNode = { name: 'ChatHubVectorStoreQdrant' } as any;
	const mockLogger = {
		debug: jest.fn(),
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		verbose: jest.fn(),
	} as any;

	function makeContext(userId: string) {
		return {
			additionalData: { userId },
			getCredentials: jest.fn().mockResolvedValue(credentials),
			getNode: jest.fn().mockReturnValue(mockNode),
			logger: mockLogger,
		} as any;
	}

	beforeEach(() => {
		jest.resetAllMocks();
		MockCreateQdrantClient.mockReturnValue(mockClient as any);
		mockClient.createPayloadIndex.mockResolvedValue(undefined);
	});

	describe('getVectorStoreClient', () => {
		it('should inject userId into similaritySearch', async () => {
			const originalSearch = jest.fn().mockResolvedValue([]);
			MockQdrantVectorStore.fromExistingCollection = jest.fn().mockResolvedValue({
				similaritySearch: originalSearch,
				similaritySearchWithScore: jest.fn().mockResolvedValue([]),
				similaritySearchVectorWithScore: jest.fn().mockResolvedValue([]),
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

		it('should merge userId with an existing filter', async () => {
			const originalSearch = jest.fn().mockResolvedValue([]);
			MockQdrantVectorStore.fromExistingCollection = jest.fn().mockResolvedValue({
				similaritySearch: originalSearch,
				similaritySearchWithScore: jest.fn().mockResolvedValue([]),
				similaritySearchVectorWithScore: jest.fn().mockResolvedValue([]),
			});

			const existingFilter = { must: [{ key: 'metadata.agentId', match: { value: 'agent-1' } }] };

			const node = new ChatHubVectorStoreQdrant();
			const store = await (node as any).getVectorStoreClient(
				makeContext('user-123'),
				existingFilter,
				{},
			);

			await store.similaritySearch('query');

			expect(originalSearch).toHaveBeenCalledWith(
				'query',
				undefined,
				expect.objectContaining({
					must: expect.arrayContaining([
						{ key: 'metadata.userId', match: { value: 'user-123' } },
						{ key: 'metadata.agentId', match: { value: 'agent-1' } },
					]),
				}),
				undefined,
			);
		});
	});

	describe('populateVectorStore', () => {
		it('should add userId to every document before insertion', async () => {
			MockQdrantVectorStore.fromDocuments = jest.fn().mockResolvedValue(undefined);

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
	});

	describe('deleteDocuments', () => {
		it('should always prepend userId to the delete filter', async () => {
			mockClient.delete.mockResolvedValue(undefined);

			await capturedDeleteDocuments.call(makeContext('user-789'), {
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

			await capturedDeleteDocuments.call(makeContext('user-789'), { filter: {} });

			expect(mockClient.delete).toHaveBeenCalledWith('chat_hub', {
				filter: {
					must: [{ key: 'metadata.userId', match: { value: 'user-789' } }],
				},
			});
		});
	});
});
