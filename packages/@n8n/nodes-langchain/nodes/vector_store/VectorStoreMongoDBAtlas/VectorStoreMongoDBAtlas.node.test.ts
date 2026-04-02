import { mock } from 'jest-mock-extended';
import { MongoClient } from 'mongodb';
import type { ILoadOptionsFunctions, ISupplyDataFunctions } from 'n8n-workflow';

import {
	EMBEDDING_NAME,
	getCollectionName,
	getCollections,
	getEmbeddingFieldName,
	getFilterValue,
	getMetadataFieldName,
	createMongoClient,
	getVectorIndexName,
	METADATA_FIELD_NAME,
	MONGODB_COLLECTION_NAME,
	VECTOR_INDEX_NAME,
} from './VectorStoreMongoDBAtlas.node';

jest.mock('mongodb', () => ({
	MongoClient: jest.fn(),
}));

describe('VectorStoreMongoDBAtlas', () => {
	const helpers = mock<ILoadOptionsFunctions['helpers']>();
	const executeFunctions = mock<ILoadOptionsFunctions>({ helpers });
	const dataHelpers = mock<ISupplyDataFunctions['helpers']>();
	const dataFunctions = mock<ISupplyDataFunctions>({ helpers: dataHelpers });

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('.createMongoClient', () => {
		const mockContext = mock<ISupplyDataFunctions>({
			getCredentials: jest.fn(),
		});
		const mockClient = {
			connect: jest.fn().mockResolvedValue(undefined),
			close: jest.fn().mockResolvedValue(undefined),
		};
		const MockMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>;

		it('should create a fresh client on every call', async () => {
			const mockClient2 = {
				connect: jest.fn().mockResolvedValue(undefined),
				close: jest.fn().mockResolvedValue(undefined),
			};
			MockMongoClient.mockImplementationOnce(
				() => mockClient as unknown as MongoClient,
			).mockImplementationOnce(() => mockClient2 as unknown as MongoClient);
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
			MockMongoClient.mockImplementation(() => mockClient as unknown as MongoClient);
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
			MockMongoClient.mockImplementation(() => mockClient as unknown as MongoClient);
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
			MockMongoClient.mockImplementation(() => mockClient as unknown as MongoClient);
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
		const MockMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>;

		it('should create and close its own client', async () => {
			const mockCollections = [{ name: 'Col1' }, { name: 'Col2' }];
			const mockClient = {
				connect: jest.fn().mockResolvedValue(undefined),
				close: jest.fn().mockResolvedValue(undefined),
				db: jest.fn().mockReturnValue({
					listCollections: jest.fn().mockReturnValue({
						toArray: jest.fn().mockResolvedValue(mockCollections),
					}),
				}),
			};
			MockMongoClient.mockImplementation(() => mockClient as unknown as MongoClient);

			const context = mock<ILoadOptionsFunctions>({
				getCredentials: jest.fn().mockResolvedValue({
					configurationType: 'connectionString',
					connectionString: 'mongodb://localhost:27017',
					database: 'testdb',
				}),
				getNode: jest.fn().mockReturnValue({ typeVersion: 1.1 }),
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
				connect: jest.fn().mockResolvedValue(undefined),
				close: jest.fn().mockResolvedValue(undefined),
				db: jest.fn().mockReturnValue({
					listCollections: jest.fn().mockReturnValue({
						toArray: jest.fn().mockRejectedValue(new Error('db error')),
					}),
				}),
			};
			MockMongoClient.mockImplementation(() => mockClient as unknown as MongoClient);

			const context = mock<ILoadOptionsFunctions>({
				getCredentials: jest.fn().mockResolvedValue({
					configurationType: 'connectionString',
					connectionString: 'mongodb://localhost:27017',
					database: 'testdb',
				}),
				getNode: jest.fn().mockReturnValue({ typeVersion: 1.1 }),
			});

			await expect(getCollections.call(context)).rejects.toThrow('Error: db error');
			expect(mockClient.close).toHaveBeenCalledTimes(1);
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
