import { MongoClient } from 'mongodb';

import { getMongoClient, mongoConfig } from './VectorStoreMongoDBAtlas.node';

jest.mock('mongodb', () => ({
	MongoClient: jest.fn(),
}));

describe('VectorStoreMongoDBAtlas -> getMongoClient', () => {
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
		jest.resetAllMocks();
		mongoConfig.client = null;
		mongoConfig.connectionString = '';
	});

	it('should reuse the same client when connection string is unchanged', async () => {
		MockMongoClient.mockImplementation(() => mockClient1 as unknown as MongoClient);
		mockContext.getCredentials.mockResolvedValue({
			connectionString: 'mongodb://localhost:27017',
		});

		const client1 = await getMongoClient(mockContext);
		const client2 = await getMongoClient(mockContext);

		expect(MockMongoClient).toHaveBeenCalledTimes(1);
		expect(MockMongoClient).toHaveBeenCalledWith('mongodb://localhost:27017', {
			appName: 'devrel.integration.n8n_vector_integ',
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

		const client1 = await getMongoClient(mockContext);
		const client2 = await getMongoClient(mockContext);

		expect(MockMongoClient).toHaveBeenCalledTimes(2);
		expect(MockMongoClient).toHaveBeenNthCalledWith(1, 'mongodb://localhost:27017', {
			appName: 'devrel.integration.n8n_vector_integ',
		});
		expect(MockMongoClient).toHaveBeenNthCalledWith(2, 'mongodb://different-host:27017', {
			appName: 'devrel.integration.n8n_vector_integ',
		});
		expect(mockClient1.connect).toHaveBeenCalledTimes(1);
		expect(mockClient1.close).toHaveBeenCalledTimes(1);
		expect(mockClient2.connect).toHaveBeenCalledTimes(1);
		expect(mockClient2.close).not.toHaveBeenCalled();
		expect(client1).toBe(mockClient1);
		expect(client2).toBe(mockClient2);
	});
});
