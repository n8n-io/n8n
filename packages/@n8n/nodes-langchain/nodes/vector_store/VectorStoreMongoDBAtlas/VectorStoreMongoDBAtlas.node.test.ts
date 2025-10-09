import { mock } from 'jest-mock-extended';
import { MongoClient } from 'mongodb';
import type { ILoadOptionsFunctions, ISupplyDataFunctions } from 'n8n-workflow';

import {
	EMBEDDING_NAME,
	getCollectionName,
	getEmbeddingFieldName,
	getFilterValue,
	getMetadataFieldName,
	getMongoClient,
	getVectorIndexName,
	mongoConfig,
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

	describe('.getMongoClient', () => {
		const mockContext = {
			getCredentials: jest.fn(),
		};
		const mockClient1 = {
			connect: jest.fn().mockResolvedValue(undefined),
			close: jest.fn().mockResolvedValue(undefined),
		};
		const mockClient2 = {
			connect: jest.fn().mockResolvedValue(undefined),
			close: jest.fn().mockResolvedValue(undefined),
		};
		const MockMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>;

		beforeEach(() => {
			mongoConfig.client = null;
			mongoConfig.connectionString = '';
		});

		it('should reuse the same client when connection string is unchanged', async () => {
			MockMongoClient.mockImplementation(() => mockClient1 as unknown as MongoClient);
			mockContext.getCredentials.mockResolvedValue({
				connectionString: 'mongodb://localhost:27017',
			});

			const client1 = await getMongoClient(mockContext, 1.1);
			const client2 = await getMongoClient(mockContext, 1.1);

			expect(MockMongoClient).toHaveBeenCalledTimes(1);
			expect(MockMongoClient).toHaveBeenCalledWith('mongodb://localhost:27017', {
				appName: 'devrel.integration.n8n_vector_integ',
				driverInfo: {
					name: 'n8n_vector',
					version: '1.1',
				},
			});
			expect(mockClient1.connect).toHaveBeenCalledTimes(1);
			expect(mockClient1.close).not.toHaveBeenCalled();
			expect(mockClient2.connect).not.toHaveBeenCalled();
			expect(client1).toBe(mockClient1);
			expect(client2).toBe(mockClient1);
		});

		it('should create new client when connection string changes', async () => {
			MockMongoClient.mockImplementationOnce(
				() => mockClient1 as unknown as MongoClient,
			).mockImplementationOnce(() => mockClient2 as unknown as MongoClient);
			mockContext.getCredentials
				.mockResolvedValueOnce({
					connectionString: 'mongodb://localhost:27017',
				})
				.mockResolvedValueOnce({
					connectionString: 'mongodb://different-host:27017',
				});

			const client1 = await getMongoClient(mockContext, 1.1);
			const client2 = await getMongoClient(mockContext, 1.1);

			expect(MockMongoClient).toHaveBeenCalledTimes(2);
			expect(MockMongoClient).toHaveBeenNthCalledWith(1, 'mongodb://localhost:27017', {
				appName: 'devrel.integration.n8n_vector_integ',
				driverInfo: {
					name: 'n8n_vector',
					version: '1.1',
				},
			});
			expect(MockMongoClient).toHaveBeenNthCalledWith(2, 'mongodb://different-host:27017', {
				appName: 'devrel.integration.n8n_vector_integ',
				driverInfo: {
					name: 'n8n_vector',
					version: '1.1',
				},
			});
			expect(mockClient1.connect).toHaveBeenCalledTimes(1);
			expect(mockClient1.close).toHaveBeenCalledTimes(1);
			expect(mockClient2.connect).toHaveBeenCalledTimes(1);
			expect(mockClient2.close).not.toHaveBeenCalled();
			expect(client1).toBe(mockClient1);
			expect(client2).toBe(mockClient2);
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
