import { Chroma } from '@langchain/community/vectorstores/chroma';
import { ChromaClient, CloudClient } from 'chromadb';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import * as ChromaNode from './VectorStoreChromaDB.node';
import type { MockedClass } from 'vitest';

// Mock external modules
vi.mock('chromadb', () => {
	return {
		ChromaClient: vi.fn(),
		CloudClient: vi.fn(),
	};
});

vi.mock('@langchain/community/vectorstores/chroma', () => {
	const state: { ctorArgs?: unknown[] } = { ctorArgs: undefined };
	class Chroma {
		static fromDocuments = vi.fn();
		static fromExistingCollection = vi.fn();
		similaritySearchVectorWithScore = vi.fn();
		constructor(...args: unknown[]) {
			state.ctorArgs = args;
		}
	}
	return { Chroma, __state: state };
});

vi.mock('@n8n/ai-utilities', () => ({
	createVectorStoreNode: (config: {
		getVectorStoreClient: (...args: unknown[]) => unknown;
		populateVectorStore: (...args: unknown[]) => unknown;
		methods: {
			listSearch: {
				chromaCollectionsSearch: (
					this: ISupplyDataFunctions,
				) => Promise<{ results: Array<{ name: string; value: string }> }>;
			};
		};
	}) =>
		class BaseNode {
			async getVectorStoreClient(...args: unknown[]) {
				return config.getVectorStoreClient.apply(config, args);
			}
			async populateVectorStore(...args: unknown[]) {
				return config.populateVectorStore.apply(config, args);
			}
			async chromaCollectionsSearch(...args: unknown[]) {
				return await config.methods.listSearch.chromaCollectionsSearch.apply(
					this as any,
					args as any,
				);
			}
		},
	metadataFilterField: {},
}));
vi.mock('../shared/descriptions', () => ({ chromaCollectionRLC: {} }));

const MockChromaClient = ChromaClient as MockedClass<typeof ChromaClient>;
const MockCloudClient = CloudClient as MockedClass<typeof CloudClient>;
const MockChroma = Chroma as MockedClass<typeof Chroma>;

describe('VectorStoreChromaDB.node', () => {
	const helpers = mock<ISupplyDataFunctions['helpers']>();
	const dataFunctions = mock<ISupplyDataFunctions>({ helpers });
	dataFunctions.logger = {
		info: vi.fn(),
		debug: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		verbose: vi.fn(),
	} as unknown as ISupplyDataFunctions['logger'];

	const selfHostedCredentials = {
		authentication: 'apiKey',
		baseUrl: 'http://localhost:8000',
		apiKey: 'test-api-key',
	};

	const cloudCredentials = {
		authentication: 'chromaCloudApi',
		apiKey: 'cloud-api-key',
		tenant: 'test-tenant',
		database: 'test-database',
	};

	const mockChromaClientInstance = {
		deleteCollection: vi.fn(),
		listCollections: vi.fn(),
	};

	const mockCloudClientInstance = {
		deleteCollection: vi.fn(),
		listCollections: vi.fn(),
	};

	beforeEach(() => {
		vi.resetAllMocks();
		MockChromaClient.mockImplementation(function () {
			return mockChromaClientInstance as unknown as ChromaClient;
		});
		MockCloudClient.mockImplementation(function () {
			return mockCloudClientInstance as unknown as CloudClient;
		});
	});

	describe('getVectorStoreClient', () => {
		it('should create self-hosted client correctly', async () => {
			const mockEmbeddings = {};
			const mockVectorStore = {
				similaritySearchVectorWithScore: vi.fn(),
			};

			MockChroma.fromExistingCollection = vi.fn().mockResolvedValue(mockVectorStore);

			const context = {
				getCredentials: vi.fn().mockResolvedValue(selfHostedCredentials),
				getNodeParameter: vi.fn((name: string) => {
					if (name === 'chromaCollection') return 'test-collection';
					if (name === 'authentication') return 'chromaSelfHostedApi';
					return undefined;
				}),
				getNode: () => ({
					name: 'VectorStoreChromaDB',
					credentials: { chromaSelfHostedApi: {} },
				}),
				logger: dataFunctions.logger,
			} as never;

			const node = new ChromaNode.VectorStoreChromaDB();
			await (node as any).getVectorStoreClient(context, undefined, mockEmbeddings, 0);

			expect(MockChroma.fromExistingCollection).toHaveBeenCalledWith(
				mockEmbeddings,
				expect.objectContaining({
					collectionName: 'test-collection',
					clientParams: expect.objectContaining({
						host: 'localhost',
						port: 8000,
						ssl: false,
						headers: { Authorization: 'Bearer test-api-key' },
					}),
				}),
			);
		});

		it('should create cloud client correctly', async () => {
			const mockEmbeddings = {};
			const mockVectorStore = {};

			MockChroma.fromExistingCollection = vi.fn().mockResolvedValue(mockVectorStore);

			const context = {
				getCredentials: vi.fn().mockResolvedValue(cloudCredentials),
				getNodeParameter: vi.fn((name: string) => {
					if (name === 'chromaCollection') return 'test-collection';
					if (name === 'authentication') return 'chromaCloudApi';
					return undefined;
				}),
				getNode: () => ({
					name: 'VectorStoreChromaDB',
					credentials: { chromaCloudApi: {} },
				}),
				logger: dataFunctions.logger,
			} as never;

			const node = new ChromaNode.VectorStoreChromaDB();
			await (node as any).getVectorStoreClient(context, undefined, mockEmbeddings, 0);

			expect(MockChroma.fromExistingCollection).toHaveBeenCalledWith(
				mockEmbeddings,
				expect.objectContaining({
					collectionName: 'test-collection',
					clientParams: {
						apiKey: 'cloud-api-key',
						tenant: 'test-tenant',
						database: 'test-database',
					},
				}),
			);
		});
	});

	describe('populateVectorStore', () => {
		it('should populate vector store and clear collection if requested', async () => {
			const mockEmbeddings = {};
			const mockDocuments = [{ pageContent: 'test', metadata: {} }];

			MockChroma.fromDocuments = vi.fn().mockResolvedValue(undefined);

			const context = {
				getCredentials: vi.fn().mockResolvedValue(selfHostedCredentials),
				getNodeParameter: vi.fn((name: string) => {
					if (name === 'chromaCollection') return 'test-collection';
					if (name === 'options') return { clearCollection: true };
					if (name === 'authentication') return 'chromaSelfHostedApi';
					return undefined;
				}),
				getNode: () => ({
					name: 'VectorStoreChromaDB',
					credentials: { chromaSelfHostedApi: {} },
				}),
				logger: dataFunctions.logger,
			} as never;

			const node = new ChromaNode.VectorStoreChromaDB();
			await (node as any).populateVectorStore(context, mockEmbeddings, mockDocuments, 0);

			expect(MockChromaClient).toHaveBeenCalled();
			expect(mockChromaClientInstance.deleteCollection).toHaveBeenCalledWith({
				name: 'test-collection',
			});
			expect(MockChroma.fromDocuments).toHaveBeenCalled();
		});

		it('should not clear collection if not requested', async () => {
			const mockEmbeddings = {};
			const mockDocuments = [{ pageContent: 'test', metadata: {} }];

			MockChroma.fromDocuments = vi.fn().mockResolvedValue(undefined);

			const context = {
				getCredentials: vi.fn().mockResolvedValue(selfHostedCredentials),
				getNodeParameter: vi.fn((name: string) => {
					if (name === 'chromaCollection') return 'test-collection';
					if (name === 'options') return { clearCollection: false };
					if (name === 'authentication') return 'chromaSelfHostedApi';
					return undefined;
				}),
				getNode: () => ({
					name: 'VectorStoreChromaDB',
					credentials: { chromaSelfHostedApi: {} },
				}),
				logger: dataFunctions.logger,
			} as never;

			const node = new ChromaNode.VectorStoreChromaDB();
			await (node as any).populateVectorStore(context, mockEmbeddings, mockDocuments, 0);

			expect(mockChromaClientInstance.deleteCollection).not.toHaveBeenCalled();
			expect(MockChroma.fromDocuments).toHaveBeenCalled();
		});
	});

	describe('listSearch', () => {
		it('should list collections for self-hosted', async () => {
			const collections = [{ name: 'Collection1' }, { name: 'Collection2' }];
			mockChromaClientInstance.listCollections.mockResolvedValue(collections as any);

			const context = {
				getCredentials: vi.fn().mockResolvedValue(selfHostedCredentials),
				getNodeParameter: vi.fn((name: string) => {
					if (name === 'authentication') return 'chromaSelfHostedApi';
					return undefined;
				}),
				getNode: () => ({
					name: 'VectorStoreChromaDB',
					credentials: { chromaSelfHostedApi: {} },
				}),
			} as never;

			const node = new ChromaNode.VectorStoreChromaDB();
			const result = await (node as any).chromaCollectionsSearch.call(context);

			expect(result).toEqual({
				results: [
					{ name: 'Collection1', value: 'Collection1' },
					{ name: 'Collection2', value: 'Collection2' },
				],
			});
		});

		it('should handle authentication errors', async () => {
			mockChromaClientInstance.listCollections.mockRejectedValue(new Error('401 Unauthorized'));

			const context = {
				getCredentials: vi.fn().mockResolvedValue(selfHostedCredentials),
				getNodeParameter: vi.fn((name: string) => {
					if (name === 'authentication') return 'chromaSelfHostedApi';
					return undefined;
				}),
				getNode: () => ({
					name: 'VectorStoreChromaDB',
					credentials: { chromaSelfHostedApi: {} },
				}),
			} as never;

			const node = new ChromaNode.VectorStoreChromaDB();

			await expect((node as any).chromaCollectionsSearch.call(context)).rejects.toThrow(
				'Authentication failed',
			);
		});
	});
});
