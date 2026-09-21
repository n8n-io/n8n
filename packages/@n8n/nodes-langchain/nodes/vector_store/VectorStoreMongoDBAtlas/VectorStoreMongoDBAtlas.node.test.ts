import { MongoClient } from 'mongodb';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import type { ILoadOptionsFunctions, ISupplyDataFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	EMBEDDING_NAME,
	getCollectionName,
	getCollections,
	getDocumentDbEndpointType,
	getEmbeddingFieldName,
	getFilterValue,
	getMetadataFieldName,
	createMongoClient,
	ExtendedMongoDBAtlasVectorSearch,
	getVectorIndexName,
	hasVectorIndex,
	METADATA_FIELD_NAME,
	MONGODB_COLLECTION_NAME,
	VECTOR_INDEX_NAME,
} from './VectorStoreMongoDBAtlas.node';
import type { MockedClass } from 'vitest';

vi.mock('mongodb', () => ({
	MongoClient: vi.fn(),
}));

describe('VectorStoreMongoDBAtlas', () => {
	const helpers = mock<ILoadOptionsFunctions['helpers']>();
	const executeFunctions = mock<ILoadOptionsFunctions>({ helpers });
	const dataHelpers = mock<ISupplyDataFunctions['helpers']>();
	const dataFunctions = mock<ISupplyDataFunctions>({ helpers: dataHelpers });

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('.createMongoClient', () => {
		const mockContext = mock<ISupplyDataFunctions>({
			getCredentials: vi.fn(),
		});
		const mockClient = {
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		};
		const MockMongoClient = MongoClient as MockedClass<typeof MongoClient>;

		it('should create a fresh client on every call', async () => {
			const mockClient2 = {
				connect: vi.fn().mockResolvedValue(undefined),
				close: vi.fn().mockResolvedValue(undefined),
			};
			MockMongoClient.mockImplementationOnce(function () {
				return mockClient as unknown as MongoClient;
			}).mockImplementationOnce(function () {
				return mockClient2 as unknown as MongoClient;
			});
			mockContext.getCredentials.mockResolvedValue({
				configurationType: 'connectionString',
				connectionString: 'mongodb://localhost:27017',
			});

			const client1 = await createMongoClient(mockContext, 1.1);
			const client2 = await createMongoClient(mockContext, 1.1);

			expect(MockMongoClient).toHaveBeenCalledTimes(2);
			expect(mockClient.connect).toHaveBeenCalledTimes(1);
			expect(mockClient2.connect).toHaveBeenCalledTimes(1);
			expect(client1).toBe(mockClient);
			expect(client2).toBe(mockClient2);
		});

		it('should create client with connectionString config', async () => {
			MockMongoClient.mockImplementation(function () {
				return mockClient as unknown as MongoClient;
			});
			mockContext.getCredentials.mockResolvedValue({
				configurationType: 'connectionString',
				connectionString: 'mongodb://localhost:27017',
			});

			const client = await createMongoClient(mockContext, 1.1);

			expect(MockMongoClient).toHaveBeenCalledTimes(1);
			expect(MockMongoClient).toHaveBeenCalledWith('mongodb://localhost:27017', {
				appName: 'devrel.integration.n8n_vector_integ',
				driverInfo: {
					name: 'n8n_vector',
					version: '1.1',
				},
			});
			expect(mockClient.connect).toHaveBeenCalledTimes(1);
			expect(client).toBe(mockClient);
		});

		it('should create client with values configuration and port specified', async () => {
			MockMongoClient.mockImplementation(function () {
				return mockClient as unknown as MongoClient;
			});
			mockContext.getCredentials.mockResolvedValue({
				configurationType: 'values',
				host: 'localhost',
				user: 'testuser',
				password: 'testpass',
				port: 27017,
				database: 'testdb',
			});

			const client = await createMongoClient(mockContext, 1.1);

			expect(MockMongoClient).toHaveBeenCalledTimes(1);
			expect(MockMongoClient).toHaveBeenCalledWith('mongodb://testuser:testpass@localhost:27017', {
				appName: 'devrel.integration.n8n_vector_integ',
				driverInfo: {
					name: 'n8n_vector',
					version: '1.1',
				},
			});
			expect(mockClient.connect).toHaveBeenCalledTimes(1);
			expect(client).toBe(mockClient);
		});

		it('should create client with values configuration without port (Atlas format)', async () => {
			MockMongoClient.mockImplementation(function () {
				return mockClient as unknown as MongoClient;
			});
			mockContext.getCredentials.mockResolvedValue({
				configurationType: 'values',
				host: 'cluster0.mongodb.net',
				user: 'atlasuser',
				password: 'atlaspass',
				database: 'atlasdb',
			});

			const client = await createMongoClient(mockContext, 1.1);

			expect(MockMongoClient).toHaveBeenCalledTimes(1);
			expect(MockMongoClient).toHaveBeenCalledWith(
				'mongodb+srv://atlasuser:atlaspass@cluster0.mongodb.net',
				{
					appName: 'devrel.integration.n8n_vector_integ',
					driverInfo: {
						name: 'n8n_vector',
						version: '1.1',
					},
				},
			);
			expect(mockClient.connect).toHaveBeenCalledTimes(1);
			expect(client).toBe(mockClient);
		});
	});

	describe('.getCollections', () => {
		const MockMongoClient = MongoClient as MockedClass<typeof MongoClient>;

		it('should create and close its own client', async () => {
			const mockCollections = [{ name: 'Col1' }, { name: 'Col2' }];
			const mockClient = {
				connect: vi.fn().mockResolvedValue(undefined),
				close: vi.fn().mockResolvedValue(undefined),
				db: vi.fn().mockReturnValue({
					listCollections: vi.fn().mockReturnValue({
						toArray: vi.fn().mockResolvedValue(mockCollections),
					}),
				}),
			};
			MockMongoClient.mockImplementation(function () {
				return mockClient as unknown as MongoClient;
			});

			const context = mock<ILoadOptionsFunctions>({
				getCredentials: vi.fn().mockResolvedValue({
					configurationType: 'connectionString',
					connectionString: 'mongodb://localhost:27017',
					database: 'testdb',
				}),
				getNode: vi.fn().mockReturnValue({ typeVersion: 1.1 }),
			});

			const result = await getCollections.call(context);

			expect(result).toEqual({
				results: [
					{ name: 'Col1', value: 'Col1' },
					{ name: 'Col2', value: 'Col2' },
				],
			});
			expect(mockClient.connect).toHaveBeenCalledTimes(1);
			expect(mockClient.close).toHaveBeenCalledTimes(1);
		});

		it('should close client even when an error occurs', async () => {
			const mockClient = {
				connect: vi.fn().mockResolvedValue(undefined),
				close: vi.fn().mockResolvedValue(undefined),
				db: vi.fn().mockReturnValue({
					listCollections: vi.fn().mockReturnValue({
						toArray: vi.fn().mockRejectedValue(new Error('db error')),
					}),
				}),
			};
			MockMongoClient.mockImplementation(function () {
				return mockClient as unknown as MongoClient;
			});

			const context = mock<ILoadOptionsFunctions>({
				getCredentials: vi.fn().mockResolvedValue({
					configurationType: 'connectionString',
					connectionString: 'mongodb://localhost:27017',
					database: 'testdb',
				}),
				getNode: vi.fn().mockReturnValue({ typeVersion: 1.1 }),
			});

			await expect(getCollections.call(context)).rejects.toThrow('Error: db error');
			expect(mockClient.close).toHaveBeenCalledTimes(1);
		});
	});

	describe('.getDocumentDbEndpointType', () => {
		it('detects Azure DocumentDB endpoints case-insensitively and caches the result', async () => {
			const command = vi.fn().mockResolvedValue({
				internal: { kind: 'AzureDocumentDB' },
			});
			const client = {
				db: vi.fn(() => ({ command })),
			} as unknown as MongoClient;

			await expect(getDocumentDbEndpointType(client)).resolves.toBe('azure');
			await expect(getDocumentDbEndpointType(client)).resolves.toBe('azure');
			expect(command).toHaveBeenCalledOnce();
			expect(command).toHaveBeenCalledWith({ hello: 1 });
		});

		it('returns false for MongoDB endpoints', async () => {
			const client = {
				db: vi.fn(() => ({
					command: vi.fn().mockResolvedValue({ isWritablePrimary: true }),
				})),
			} as unknown as MongoClient;

			await expect(getDocumentDbEndpointType(client)).resolves.toBeUndefined();
		});

		it('detects the open-source DocumentDB hello signature', async () => {
			const client = {
				db: vi.fn(() => ({
					command: vi.fn().mockResolvedValue({
						internal: { documentdb_versions: ['0.117.0'], kind: '' },
					}),
				})),
			} as unknown as MongoClient;

			await expect(getDocumentDbEndpointType(client)).resolves.toBe('openSource');
		});

		it('returns false when the endpoint probe fails', async () => {
			const client = {
				db: vi.fn(() => ({
					command: vi.fn().mockRejectedValue(new Error('hello is unavailable')),
				})),
			} as unknown as MongoClient;

			await expect(getDocumentDbEndpointType(client)).resolves.toBeUndefined();
		});
	});

	describe('.hasVectorIndex', () => {
		it('does not use Atlas search index discovery for DocumentDB', async () => {
			const listSearchIndexes = vi.fn();
			const collection = { listSearchIndexes };

			await expect(hasVectorIndex(collection as never, 'vector-index', 'azure')).resolves.toBe(
				true,
			);
			expect(listSearchIndexes).not.toHaveBeenCalled();
		});

		it('checks search indexes for MongoDB Atlas', async () => {
			const toArray = vi.fn().mockResolvedValue([{ name: 'vector-index' }]);
			const collection = {
				listSearchIndexes: vi.fn(() => ({ toArray })),
			};

			await expect(hasVectorIndex(collection as never, 'vector-index', undefined)).resolves.toBe(
				true,
			);
			expect(collection.listSearchIndexes).toHaveBeenCalledOnce();
		});
	});

	describe('ExtendedMongoDBAtlasVectorSearch', () => {
		it('uses open-source DocumentDB vector search without an Atlas index name', async () => {
			const toArray = vi.fn().mockResolvedValue([
				{
					text: 'Matched document',
					category: 'support',
					score: 0.91,
				},
			]);
			const aggregate = vi.fn(() => ({ toArray }));
			const collection = {
				aggregate,
				db: { client: { appendMetadata: vi.fn() } },
			};
			const client = {} as MongoClient;
			const embeddings = mock<EmbeddingsInterface>();
			const vectorStore = new ExtendedMongoDBAtlasVectorSearch(
				embeddings,
				{
					collection: collection as never,
					indexName: 'atlas-index',
					textKey: 'text',
					embeddingKey: 'embedding',
				},
				client,
				{ category: 'support' },
				[{ $match: { active: true } }],
				'openSource',
			);

			const results = await vectorStore.similaritySearchVectorWithScore([1, 0.25], 3);

			expect(aggregate).toHaveBeenCalledWith([
				{
					$vectorSearch: {
						queryVector: [1.000000000000001, 0.25],
						path: 'embedding',
						limit: 3,
						numCandidates: 30,
						filter: { category: 'support' },
					},
				},
				{ $set: { score: { $meta: 'vectorSearchScore' } } },
				{ $project: { embedding: 0 } },
				{ $match: { active: true } },
			]);
			expect(results).toEqual([
				[
					expect.objectContaining({
						pageContent: 'Matched document',
						metadata: { category: 'support' },
					}),
					0.91,
				],
			]);
		});

		it('uses Azure DocumentDB cosmos search and search scores', async () => {
			const toArray = vi.fn().mockResolvedValue([
				{
					text: 'Matched document',
					category: 'support',
					score: 0.92,
				},
			]);
			const aggregate = vi.fn(() => ({ toArray }));
			const collection = {
				aggregate,
				db: { client: { appendMetadata: vi.fn() } },
			};
			const vectorStore = new ExtendedMongoDBAtlasVectorSearch(
				mock<EmbeddingsInterface>(),
				{
					collection: collection as never,
					indexName: 'ignored-index',
					textKey: 'text',
					embeddingKey: 'embedding',
				},
				{} as MongoClient,
				{ category: 'support' },
				[{ $match: { active: true } }],
				'azure',
			);

			const results = await vectorStore.similaritySearchVectorWithScore([1, 0.25], 3);

			expect(aggregate).toHaveBeenCalledWith([
				{
					$search: {
						cosmosSearch: {
							vector: [1.000000000000001, 0.25],
							path: 'embedding',
							k: 3,
							filter: { category: 'support' },
						},
						returnStoredSource: true,
					},
				},
				{ $set: { score: { $meta: 'searchScore' } } },
				{ $project: { embedding: 0 } },
				{ $match: { active: true } },
			]);
			expect(results[0]?.[0].pageContent).toBe('Matched document');
			expect(results[0]?.[1]).toBe(0.92);
		});

		it('preserves the MongoDB Atlas vector search path', async () => {
			const rawResults = [
				{
					text: 'Atlas result',
					category: 'support',
					score: 0.93,
				},
			];
			const toArray = vi.fn();
			const map = vi.fn((mapper: (result: (typeof rawResults)[number]) => unknown) => {
				toArray.mockResolvedValue(rawResults.map(mapper));
				return { toArray };
			});
			const aggregate = vi.fn(() => ({ map }));
			const collection = {
				aggregate,
				db: { client: { appendMetadata: vi.fn() } },
			};
			const vectorStore = new ExtendedMongoDBAtlasVectorSearch(
				mock<EmbeddingsInterface>(),
				{
					collection: collection as never,
					indexName: 'atlas-index',
					textKey: 'text',
					embeddingKey: 'embedding',
				},
				{} as MongoClient,
				{ category: 'support' },
				[{ $match: { active: true } }],
			);

			const results = await vectorStore.similaritySearchVectorWithScore([1, 0.25], 3);

			expect(aggregate).toHaveBeenCalledWith([
				{
					$vectorSearch: {
						queryVector: [1.000000000000001, 0.25],
						index: 'atlas-index',
						path: 'embedding',
						limit: 3,
						numCandidates: 30,
						filter: { category: 'support' },
					},
				},
				{ $set: { score: { $meta: 'vectorSearchScore' } } },
				{ $project: { embedding: 0 } },
				{ $match: { active: true } },
			]);
			expect(results[0]?.[0].pageContent).toBe('Atlas result');
			expect(results[0]?.[1]).toBe(0.93);
		});
	});

	describe('.getCollectionName', () => {
		beforeEach(() => {
			executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === MONGODB_COLLECTION_NAME) return 'testCollection';
				return '';
			});
		});

		it('returns the collection name from the context', () => {
			expect(getCollectionName(executeFunctions, 0)).toEqual('testCollection');
		});
	});

	describe('.getVectorIndexName', () => {
		beforeEach(() => {
			executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === VECTOR_INDEX_NAME) return 'testIndex';
				return '';
			});
		});

		it('returns the index name from the context', () => {
			expect(getVectorIndexName(executeFunctions, 0)).toEqual('testIndex');
		});
	});

	describe('.getEmbeddingFieldName', () => {
		beforeEach(() => {
			executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === EMBEDDING_NAME) return 'testEmbedding';
				return '';
			});
		});

		it('returns the embedding name from the context', () => {
			expect(getEmbeddingFieldName(executeFunctions, 0)).toEqual('testEmbedding');
		});
	});

	describe('.getMetadataFieldName', () => {
		beforeEach(() => {
			executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === METADATA_FIELD_NAME) return 'testMetadata';
				return '';
			});
		});

		it('returns the metadata field name from the context', () => {
			expect(getMetadataFieldName(executeFunctions, 0)).toEqual('testMetadata');
		});
	});

	describe('.getFilterValue', () => {
		describe('when no post filter is present', () => {
			beforeEach(() => {
				dataFunctions.getNodeParameter.mockImplementation(() => {
					return {};
				});
			});

			it('returns undefined', () => {
				expect(getFilterValue('postFilterPipeline', dataFunctions, 0)).toEqual(undefined);
			});
		});

		describe('when a post filter is present', () => {
			describe('when the JSON is valid', () => {
				beforeEach(() => {
					dataFunctions.getNodeParameter.mockImplementation(() => {
						return { postFilterPipeline: '[{ "$match": { "name": "value" }}]' };
					});
				});

				it('returns the post filter pipeline', () => {
					expect(getFilterValue('postFilterPipeline', dataFunctions, 0)).toEqual([
						{ $match: { name: 'value' } },
					]);
				});
			});

			describe('when the JSON is invalid', () => {
				beforeEach(() => {
					dataFunctions.getNodeParameter.mockImplementation(() => {
						return { postFilterPipeline: '[{ "$match": { "name":}}]' };
					});
				});

				it('throws an error', () => {
					expect(() => {
						getFilterValue('postFilterPipeline', dataFunctions, 0);
					}).toThrow();
				});
			});
		});

		describe('when no pre filter is present', () => {
			beforeEach(() => {
				dataFunctions.getNodeParameter.mockImplementation(() => {
					return {};
				});
			});

			it('returns undefined', () => {
				expect(getFilterValue('preFilter', dataFunctions, 0)).toEqual(undefined);
			});
		});

		describe('when a pre filter is present', () => {
			describe('when the JSON is valid', () => {
				beforeEach(() => {
					dataFunctions.getNodeParameter.mockImplementation(() => {
						return { preFilter: '{ "name": "value" }' };
					});
				});

				it('returns the pre filter', () => {
					expect(getFilterValue('preFilter', dataFunctions, 0)).toEqual({ name: 'value' });
				});
			});

			describe('when the JSON is invalid', () => {
				beforeEach(() => {
					dataFunctions.getNodeParameter.mockImplementation(() => {
						return { preFilter: '"name":}}]' };
					});
				});

				it('throws an error', () => {
					expect(() => {
						getFilterValue('preFilter', dataFunctions, 0);
					}).toThrow();
				});
			});
		});
	});
});
