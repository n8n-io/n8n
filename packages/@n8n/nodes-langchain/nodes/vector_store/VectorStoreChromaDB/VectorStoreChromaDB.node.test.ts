import { Chroma } from '@langchain/community/vectorstores/chroma';
import type { Embeddings } from '@langchain/core/embeddings';
import { ChromaClient, CloudClient } from 'chromadb';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import * as ChromaNode from './VectorStoreChromaDB.node';
import { createInsertContext } from '../../../test/vectorStoreInsert';
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

vi.mock('@n8n/ai-utilities', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/ai-utilities')>();
	const createVectorStoreNode: typeof actual.createVectorStoreNode = (config) =>
		class extends actual.createVectorStoreNode(config) {
			async getVectorStoreClient(...args: Parameters<typeof config.getVectorStoreClient>) {
				return await config.getVectorStoreClient(...args);
			}
		};
	return { ...actual, createVectorStoreNode };
});
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

	it.each([
		[1, true],
		[1.1, true],
		[1.1, false],
	])('inserts with version %s and clear=%s', async (version, clearCollection) => {
		const documents = [
			{ pageContent: 'first', metadata: {} },
			{ pageContent: 'second', metadata: {} },
		];
		const context = createInsertContext(
			version,
			{
				chromaCollection: { mode: 'list', value: 'test-collection' },
				authentication: 'chromaSelfHostedApi',
				options: { clearCollection },
			},
			mock<Embeddings>(),
			documents,
			selfHostedCredentials,
		);

		await new ChromaNode.VectorStoreChromaDB().execute.call(context);

		const { deleteCollection } = mockChromaClientInstance;
		if (clearCollection) {
			expect(deleteCollection).toHaveBeenCalledExactlyOnceWith({ name: 'test-collection' });
			expect(deleteCollection).toHaveBeenCalledBefore(vi.mocked(Chroma.fromDocuments));
		} else {
			expect(deleteCollection).not.toHaveBeenCalled();
		}
		expect(vi.mocked(Chroma.fromDocuments).mock.calls.map(([batch]) => batch)).toEqual(
			version === 1 ? [documents] : [[documents[0]], [documents[1]]],
		);
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
			const result = await node.methods?.listSearch?.chromaCollectionsSearch.call(context);

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

			await expect(node.methods?.listSearch?.chromaCollectionsSearch.call(context)).rejects.toThrow(
				'Authentication failed',
			);
		});
	});
});
