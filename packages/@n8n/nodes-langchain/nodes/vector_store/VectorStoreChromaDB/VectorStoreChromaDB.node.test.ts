import { mock } from 'jest-mock-extended';
import { ChromaClient, CloudClient } from 'chromadb';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import * as ChromaNode from './VectorStoreChromaDB.node';

// Mock external modules
jest.mock('chromadb', () => {
	return {
		ChromaClient: jest.fn(),
		CloudClient: jest.fn(),
	};
});

jest.mock('@langchain/community/vectorstores/chroma', () => {
	const state: { ctorArgs?: unknown[] } = { ctorArgs: undefined };
	class Chroma {
		static fromDocuments = jest.fn();
		static fromExistingCollection = jest.fn();
		similaritySearchVectorWithScore = jest.fn();
		constructor(...args: unknown[]) {
			state.ctorArgs = args;
		}
	}
	return { Chroma, __state: state };
});

jest.mock('@utils/sharedFields', () => ({ metadataFilterField: {} }), { virtual: true });
jest.mock('../shared/descriptions', () => ({ chromaCollectionRLC: {} }), { virtual: true });

// Mock the vector store node factory
jest.mock('../shared/createVectorStoreNode/createVectorStoreNode', () => ({
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
}));

const MockChromaClient = ChromaClient as jest.MockedClass<typeof ChromaClient>;
const MockCloudClient = CloudClient as jest.MockedClass<typeof CloudClient>;
const MockChroma = Chroma as jest.MockedClass<typeof Chroma>;

describe('VectorStoreChromaDB.node', () => {
	const helpers = mock<ISupplyDataFunctions['helpers']>();
	const dataFunctions = mock<ISupplyDataFunctions>({ helpers });
	dataFunctions.logger = {
		info: jest.fn(),
		debug: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		verbose: jest.fn(),
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
		deleteCollection: jest.fn(),
		listCollections: jest.fn(),
	};

	const mockCloudClientInstance = {
		deleteCollection: jest.fn(),
		listCollections: jest.fn(),
	};

	beforeEach(() => {
		jest.resetAllMocks();
		MockChromaClient.mockReturnValue(mockChromaClientInstance as unknown as ChromaClient);
		MockCloudClient.mockReturnValue(mockCloudClientInstance as unknown as CloudClient);
	});

	describe('getVectorStoreClient', () => {
		it('should create self-hosted client correctly', async () => {
			const mockEmbeddings = {};
			const mockVectorStore = {
				similaritySearchVectorWithScore: jest.fn(),
			};

			MockChroma.fromExistingCollection = jest.fn().mockResolvedValue(mockVectorStore);

			const context = {
				getCredentials: jest.fn().mockResolvedValue(selfHostedCredentials),
				getNodeParameter: jest.fn((name: string) => {
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

			MockChroma.fromExistingCollection = jest.fn().mockResolvedValue(mockVectorStore);

			const context = {
				getCredentials: jest.fn().mockResolvedValue(cloudCredentials),
				getNodeParameter: jest.fn((name: string) => {
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

			MockChroma.fromDocuments = jest.fn().mockResolvedValue(undefined);

			const context = {
				getCredentials: jest.fn().mockResolvedValue(selfHostedCredentials),
				getNodeParameter: jest.fn((name: string) => {
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

			MockChroma.fromDocuments = jest.fn().mockResolvedValue(undefined);

			const context = {
				getCredentials: jest.fn().mockResolvedValue(selfHostedCredentials),
				getNodeParameter: jest.fn((name: string) => {
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
				getCredentials: jest.fn().mockResolvedValue(selfHostedCredentials),
				getNodeParameter: jest.fn((name: string) => {
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
				getCredentials: jest.fn().mockResolvedValue(selfHostedCredentials),
				getNodeParameter: jest.fn((name: string) => {
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
