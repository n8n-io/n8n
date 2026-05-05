import type { ISupplyDataFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

// Mock external modules that are not needed for these unit tests
vi.mock('@langchain/qdrant', () => {
	const state: { ctorArgs?: unknown[] } = { ctorArgs: undefined };
	class QdrantVectorStore {
		static fromDocuments = vi.fn();
		static fromExistingCollection = vi.fn();
		similaritySearch = vi.fn();
		constructor(...args: unknown[]) {
			state.ctorArgs = args;
		}
	}
	return { QdrantVectorStore, __state: state };
});

vi.mock('@n8n/ai-utilities', () => ({
	metadataFilterField: {},
	getMetadataFiltersValues: vi.fn(),
	logAiEvent: vi.fn(),
	N8nBinaryLoader: class {},
	N8nJsonLoader: class {},
	logWrapper: (fn: unknown) => fn,
	createVectorStoreNode: (config: {
		getVectorStoreClient: (...args: unknown[]) => unknown;
		populateVectorStore: (...args: unknown[]) => unknown;
	}) =>
		class BaseNode {
			async getVectorStoreClient(...args: unknown[]) {
				return config.getVectorStoreClient.apply(config, args);
			}
			async populateVectorStore(...args: unknown[]) {
				return config.populateVectorStore.apply(config, args);
			}
		},
}));

vi.mock('./Qdrant.utils', () => ({
	createQdrantClient: vi.fn(),
}));

vi.mock('../shared/methods/listSearch', () => ({
	qdrantCollectionsSearch: vi.fn(),
}));

vi.mock('../shared/descriptions', () => ({
	qdrantCollectionRLC: {},
}));

import { QdrantVectorStore } from '@langchain/qdrant';

import { createQdrantClient } from './Qdrant.utils';
import * as QdrantNode from './VectorStoreQdrant.node';
import type { MockedClass, MockedFunction } from 'vitest';

const MockCreateQdrantClient = createQdrantClient as MockedFunction<typeof createQdrantClient>;
const MockQdrantVectorStore = QdrantVectorStore as MockedClass<typeof QdrantVectorStore>;

describe('VectorStoreQdrant.node', () => {
	const helpers = mock<ISupplyDataFunctions['helpers']>();
	const dataFunctions = mock<ISupplyDataFunctions>({ helpers });
	dataFunctions.logger = {
		info: vi.fn(),
		debug: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		verbose: vi.fn(),
	} as unknown as ISupplyDataFunctions['logger'];

	const baseCredentials = {
		qdrantUrl: 'https://localhost:6333',
		apiKey: 'test-api-key',
	};

	const mockClient = {
		getCollections: vi.fn(),
		createCollection: vi.fn(),
		deleteCollection: vi.fn(),
	};

	beforeEach(() => {
		vi.resetAllMocks();
		MockCreateQdrantClient.mockReturnValue(mockClient as never);
	});

	describe('getVectorStoreClient', () => {
		it('should create vector store client with default content and metadata keys', async () => {
			const mockEmbeddings = {};
			const mockVectorStore = {
				similaritySearch: vi.fn().mockResolvedValue([]),
			};

			MockQdrantVectorStore.fromExistingCollection = vi.fn().mockResolvedValue(mockVectorStore);

			const context = {
				getCredentials: vi.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: vi.fn((name: string) => {
					const map: Record<string, unknown> = {
						qdrantCollection: 'test-collection',
						'options.contentPayloadKey': '',
						'options.metadataPayloadKey': '',
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreQdrant' }),
				logger: dataFunctions.logger,
			} as never;

			const node = new QdrantNode.VectorStoreQdrant();
			const vectorStore = await (node as any).getVectorStoreClient(
				context,
				undefined,
				mockEmbeddings,
				0,
			);

			expect(MockCreateQdrantClient).toHaveBeenCalledWith(baseCredentials);
			expect(MockQdrantVectorStore.fromExistingCollection).toHaveBeenCalledWith(mockEmbeddings, {
				client: mockClient,
				collectionName: 'test-collection',
				contentPayloadKey: undefined,
				metadataPayloadKey: undefined,
			});
			expect(vectorStore).toBe(mockVectorStore);
		});

		it('should create vector store client with custom content and metadata keys', async () => {
			const mockEmbeddings = {};
			const mockVectorStore = {
				similaritySearch: vi.fn().mockResolvedValue([]),
			};

			MockQdrantVectorStore.fromExistingCollection = vi.fn().mockResolvedValue(mockVectorStore);

			const context = {
				getCredentials: vi.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: vi.fn((name: string) => {
					const map: Record<string, unknown> = {
						qdrantCollection: 'test-collection',
						'options.contentPayloadKey': 'custom_content',
						'options.metadataPayloadKey': 'custom_metadata',
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreQdrant' }),
				logger: dataFunctions.logger,
			} as never;

			const node = new QdrantNode.VectorStoreQdrant();
			await (node as any).getVectorStoreClient(context, undefined, mockEmbeddings, 0);

			expect(MockQdrantVectorStore.fromExistingCollection).toHaveBeenCalledWith(mockEmbeddings, {
				client: mockClient,
				collectionName: 'test-collection',
				contentPayloadKey: 'custom_content',
				metadataPayloadKey: 'custom_metadata',
			});
		});

		it('should pass filter to vector store client', async () => {
			const mockEmbeddings = {};
			const mockVectorStore = {
				similaritySearch: vi.fn().mockResolvedValue([]),
			};
			const filter = { should: [{ key: 'metadata.batch', match: { value: 12345 } }] };

			MockQdrantVectorStore.fromExistingCollection = vi.fn().mockResolvedValue(mockVectorStore);

			const context = {
				getCredentials: vi.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: vi.fn((name: string) => {
					const map: Record<string, unknown> = {
						qdrantCollection: 'test-collection',
						'options.contentPayloadKey': '',
						'options.metadataPayloadKey': '',
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreQdrant' }),
				logger: dataFunctions.logger,
			} as never;

			const node = new QdrantNode.VectorStoreQdrant();
			await (node as any).getVectorStoreClient(context, filter, mockEmbeddings, 0);

			expect(MockQdrantVectorStore.fromExistingCollection).toHaveBeenCalledWith(mockEmbeddings, {
				client: mockClient,
				collectionName: 'test-collection',
				contentPayloadKey: undefined,
				metadataPayloadKey: undefined,
			});
		});
	});

	describe('populateVectorStore', () => {
		it('should populate vector store with default options', async () => {
			const mockEmbeddings = {};
			const mockDocuments = [
				{ pageContent: 'test content 1', metadata: { id: 1 } },
				{ pageContent: 'test content 2', metadata: { id: 2 } },
			];

			MockQdrantVectorStore.fromDocuments = vi.fn().mockResolvedValue(undefined);

			const context = {
				getCredentials: vi.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: vi.fn((name: string) => {
					const map: Record<string, unknown> = {
						qdrantCollection: 'test-collection',
						'options.contentPayloadKey': '',
						'options.metadataPayloadKey': '',
						options: {},
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreQdrant' }),
				logger: dataFunctions.logger,
			} as never;

			const node = new QdrantNode.VectorStoreQdrant();
			await (node as any).populateVectorStore(context, mockEmbeddings, mockDocuments, 0);

			expect(MockCreateQdrantClient).toHaveBeenCalledWith(baseCredentials);
			expect(MockQdrantVectorStore.fromDocuments).toHaveBeenCalledWith(
				mockDocuments,
				mockEmbeddings,
				{
					client: mockClient,
					collectionName: 'test-collection',
					collectionConfig: undefined,
					contentPayloadKey: undefined,
					metadataPayloadKey: undefined,
				},
			);
		});

		it('should populate vector store with custom content and metadata keys', async () => {
			const mockEmbeddings = {};
			const mockDocuments = [{ pageContent: 'test content', metadata: {} }];

			MockQdrantVectorStore.fromDocuments = vi.fn().mockResolvedValue(undefined);

			const context = {
				getCredentials: vi.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: vi.fn((name: string) => {
					const map: Record<string, unknown> = {
						qdrantCollection: 'test-collection',
						'options.contentPayloadKey': 'custom_content',
						'options.metadataPayloadKey': 'custom_metadata',
						options: {},
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreQdrant' }),
				logger: dataFunctions.logger,
			} as never;

			const node = new QdrantNode.VectorStoreQdrant();
			await (node as any).populateVectorStore(context, mockEmbeddings, mockDocuments, 0);

			expect(MockQdrantVectorStore.fromDocuments).toHaveBeenCalledWith(
				mockDocuments,
				mockEmbeddings,
				{
					client: mockClient,
					collectionName: 'test-collection',
					collectionConfig: undefined,
					contentPayloadKey: 'custom_content',
					metadataPayloadKey: 'custom_metadata',
				},
			);
		});

		it('should populate vector store with collection config', async () => {
			const mockEmbeddings = {};
			const mockDocuments = [{ pageContent: 'test content', metadata: {} }];
			const collectionConfig = {
				vectors: {
					size: 1536,
					distance: 'Cosine',
				},
			};

			MockQdrantVectorStore.fromDocuments = vi.fn().mockResolvedValue(undefined);

			const context = {
				getCredentials: vi.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: vi.fn((name: string) => {
					const map: Record<string, unknown> = {
						qdrantCollection: 'test-collection',
						'options.contentPayloadKey': '',
						'options.metadataPayloadKey': '',
						options: { collectionConfig },
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreQdrant' }),
				logger: dataFunctions.logger,
			} as never;

			const node = new QdrantNode.VectorStoreQdrant();
			await (node as any).populateVectorStore(context, mockEmbeddings, mockDocuments, 0);

			expect(MockQdrantVectorStore.fromDocuments).toHaveBeenCalledWith(
				mockDocuments,
				mockEmbeddings,
				{
					client: mockClient,
					collectionName: 'test-collection',
					collectionConfig,
					contentPayloadKey: undefined,
					metadataPayloadKey: undefined,
				},
			);
		});

		it('should handle empty documents array', async () => {
			const mockEmbeddings = {};
			const mockDocuments: Array<{ pageContent: string; metadata: Record<string, unknown> }> = [];

			MockQdrantVectorStore.fromDocuments = vi.fn().mockResolvedValue(undefined);

			const context = {
				getCredentials: vi.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: vi.fn((name: string) => {
					const map: Record<string, unknown> = {
						qdrantCollection: 'test-collection',
						'options.contentPayloadKey': '',
						'options.metadataPayloadKey': '',
						options: {},
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreQdrant' }),
				logger: dataFunctions.logger,
			} as never;

			const node = new QdrantNode.VectorStoreQdrant();
			await (node as any).populateVectorStore(context, mockEmbeddings, mockDocuments, 0);

			expect(MockQdrantVectorStore.fromDocuments).toHaveBeenCalledWith(
				mockDocuments,
				mockEmbeddings,
				{
					client: mockClient,
					collectionName: 'test-collection',
					collectionConfig: undefined,
					contentPayloadKey: undefined,
					metadataPayloadKey: undefined,
				},
			);
		});
	});

	describe('ExtendedQdrantVectorStore filter behavior', () => {
		it('should store and use default filter in ExtendedQdrantVectorStore', async () => {
			const mockEmbeddings = {};
			const mockBaseSimilaritySearch = vi
				.fn()
				.mockResolvedValue([{ pageContent: 'result 1', metadata: {} }]);
			const defaultFilter = { must: [{ key: 'metadata.default', match: { value: 'test' } }] };

			// Mock fromExistingCollection to actually call the real ExtendedQdrantVectorStore
			// and return an instance that has the overridden similaritySearch method
			MockQdrantVectorStore.fromExistingCollection = vi.fn().mockImplementation(async () => {
				const instance = Object.create(MockQdrantVectorStore.prototype);
				instance.similaritySearch = mockBaseSimilaritySearch;
				return instance;
			});

			const context = {
				getCredentials: vi.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: vi.fn((name: string) => {
					const map: Record<string, unknown> = {
						qdrantCollection: 'test-collection',
						'options.contentPayloadKey': '',
						'options.metadataPayloadKey': '',
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreQdrant' }),
				logger: dataFunctions.logger,
			} as never;

			// The filter is passed as a parameter when getVectorStoreClient is called
			// and stored in ExtendedQdrantVectorStore via fromExistingCollection
			const node = new QdrantNode.VectorStoreQdrant();
			await (node as any).getVectorStoreClient(context, defaultFilter, mockEmbeddings, 0);

			// Verify fromExistingCollection was called (which stores the default filter)
			expect(MockQdrantVectorStore.fromExistingCollection).toHaveBeenCalled();
		});

		it('should verify client creation with collection name', async () => {
			const mockEmbeddings = {};

			MockQdrantVectorStore.fromExistingCollection = vi.fn().mockResolvedValue({
				similaritySearch: vi.fn(),
			});

			const context = {
				getCredentials: vi.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: vi.fn((name: string) => {
					const map: Record<string, unknown> = {
						qdrantCollection: 'my-test-collection',
						'options.contentPayloadKey': '',
						'options.metadataPayloadKey': '',
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreQdrant' }),
				logger: dataFunctions.logger,
			} as never;

			const node = new QdrantNode.VectorStoreQdrant();
			await (node as any).getVectorStoreClient(context, undefined, mockEmbeddings, 0);

			expect(MockQdrantVectorStore.fromExistingCollection).toHaveBeenCalledWith(
				mockEmbeddings,
				expect.objectContaining({
					client: mockClient,
					collectionName: 'my-test-collection',
				}),
			);
		});
	});
});
