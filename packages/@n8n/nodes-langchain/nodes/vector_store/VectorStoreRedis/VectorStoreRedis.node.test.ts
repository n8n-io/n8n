import { mock } from 'jest-mock-extended';
import { NodeOperationError, type ILoadOptionsFunctions } from 'n8n-workflow';

// Mock external modules that are not needed for these unit tests
jest.mock('@langchain/redis', () => {
	const state: any = { ctorArgs: undefined };
	class RedisVectorStore {
		static fromDocuments = jest.fn();
		constructor(...args: any[]) {
			state.ctorArgs = args;
		}
	}
	return { RedisVectorStore, __state: state };
});
jest.mock('@utils/sharedFields', () => ({ metadataFilterField: {} }), { virtual: true });
jest.mock(
	'@utils/helpers',
	() => ({ getMetadataFiltersValues: jest.fn(), logAiEvent: jest.fn() }),
	{ virtual: true },
);
jest.mock('@utils/N8nBinaryLoader', () => ({ N8nBinaryLoader: class {} }), { virtual: true });
jest.mock('@utils/N8nJsonLoader', () => ({ N8nJsonLoader: class {} }), { virtual: true });
jest.mock('@utils/logWrapper', () => ({ logWrapper: (fn: any) => fn }), { virtual: true });
// Mock the vector store node factory to avoid deep imports but preserve passed methods
jest.mock('../shared/createVectorStoreNode/createVectorStoreNode', () => ({
	createVectorStoreNode: (config: any) =>
		class BaseNode {
			async getVectorStoreClient(...args: any[]) {
				return config.getVectorStoreClient.apply(config, args);
			}
			async populateVectorStore(...args: any[]) {
				return config.populateVectorStore.apply(config, args);
			}
		},
}));
jest.mock('redis', () => ({ createClient: jest.fn() }));

import { createClient } from 'redis';

import * as RedisNode from './VectorStoreRedis.node';

const MockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('VectorStoreRedis.node', () => {
	const helpers = mock<ILoadOptionsFunctions['helpers']>();
	const loadOptionsFunctions = mock<ILoadOptionsFunctions>({ helpers });
	loadOptionsFunctions.logger = {
		info: jest.fn(),
		debug: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		verbose: jest.fn(),
	} as any;

	const baseCredentials = {
		host: 'localhost',
		port: 6379,
		ssl: false,
		user: 'default',
		password: 'pass',
		database: 0,
	} as any;

	beforeEach(() => {
		jest.resetAllMocks();
		// Reset cached client
		RedisNode.redisConfig.client = null as any;
		RedisNode.redisConfig.connectionString = '';
	});

	describe('getRedisClient', () => {
		it('creates and reuses client for same configuration', async () => {
			const mockClient = {
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				disconnect: jest.fn().mockResolvedValue(undefined),
				quit: jest.fn().mockResolvedValue(undefined),
			} as any;

			MockCreateClient.mockReturnValue(mockClient);

			const context = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
			} as any;

			const client1 = await RedisNode.getRedisClient(context);
			const client2 = await RedisNode.getRedisClient(context);

			expect(MockCreateClient).toHaveBeenCalledTimes(1);
			expect(mockClient.connect).toHaveBeenCalledTimes(1);
			expect(mockClient.disconnect).not.toHaveBeenCalled();
			expect(client1).toBe(mockClient);
			expect(client2).toBe(mockClient);
		});

		it('disconnects previous client and creates a new one when configuration changes', async () => {
			const mockClient1 = {
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				disconnect: jest.fn().mockResolvedValue(undefined),
				quit: jest.fn().mockResolvedValue(undefined),
			} as any;
			const mockClient2 = {
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				disconnect: jest.fn().mockResolvedValue(undefined),
				quit: jest.fn().mockResolvedValue(undefined),
			} as any;

			MockCreateClient.mockImplementationOnce(() => mockClient1).mockImplementationOnce(
				() => mockClient2,
			);

			const context = {
				getCredentials: jest
					.fn()
					.mockResolvedValueOnce(baseCredentials)
					.mockResolvedValueOnce({ ...baseCredentials, port: 6380 }),
			} as any;

			const client1 = await RedisNode.getRedisClient(context);
			const client2 = await RedisNode.getRedisClient(context);

			expect(MockCreateClient).toHaveBeenCalledTimes(2);
			expect(mockClient1.disconnect).toHaveBeenCalledTimes(1);
			expect(mockClient2.connect).toHaveBeenCalledTimes(1);
			expect(client1).toBe(mockClient1);
			expect(client2).toBe(mockClient2);
		});
	});

	describe('listIndexes', () => {
		it('returns mapped indexes when FT._LIST succeeds', async () => {
			const mockClient = {
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				disconnect: jest.fn(),
				quit: jest.fn(),
				ft: { _list: jest.fn().mockResolvedValue(['Idx1', 'Idx2']) },
			} as any;

			MockCreateClient.mockReturnValue(mockClient);

			(loadOptionsFunctions as any).getCredentials = jest.fn().mockResolvedValue(baseCredentials);

			const results = await (RedisNode.listIndexes as any).call(loadOptionsFunctions as any);

			expect(mockClient.ft._list).toHaveBeenCalled();
			expect(results).toEqual({
				results: [
					{ name: 'Idx1', value: 'Idx1' },
					{ name: 'Idx2', value: 'Idx2' },
				],
			});
		});

		it('returns empty results when FT._LIST fails', async () => {
			const mockClient = {
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				disconnect: jest.fn(),
				quit: jest.fn(),
				ft: { _list: jest.fn().mockRejectedValue(new Error('no module')) },
			} as any;

			MockCreateClient.mockReturnValue(mockClient);

			const failureCredentials = { ...baseCredentials, port: 6380 };
			(loadOptionsFunctions as any).getCredentials = jest
				.fn()
				.mockResolvedValue(failureCredentials);

			const results = await (RedisNode.listIndexes as any).call(loadOptionsFunctions as any);

			expect(results).toEqual({ results: [] });
		});

		it('returns empty results when FT._LIST returns unexpected data type', async () => {
			const mockClient = {
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				disconnect: jest.fn(),
				quit: jest.fn(),
				ft: { _list: jest.fn().mockResolvedValue({ unexpected: 'object' }) },
			} as any;

			MockCreateClient.mockReturnValue(mockClient);

			(loadOptionsFunctions as any).getCredentials = jest.fn().mockResolvedValue(baseCredentials);

			const results = await (RedisNode.listIndexes as any).call(loadOptionsFunctions as any);

			expect(results).toEqual({ results: [] });
			expect(loadOptionsFunctions.logger.warn).toHaveBeenCalledWith(
				'FT._LIST returned unexpected data type',
			);
		});
	});

	describe('getVectorStoreClient', () => {
		it('constructs ExtendedRedisVectorSearch with correct options and passes filter tokens', async () => {
			const mockClient = {
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				disconnect: jest.fn(),
				quit: jest.fn(),
				sendCommand: jest
					.fn()
					.mockImplementation(async ([cmd]) =>
						cmd === 'FT.INFO' ? await Promise.resolve(undefined) : await Promise.resolve([]),
					),
			} as any;

			// Adapt to new client.ft.info usage
			mockClient.ft = { ...(mockClient.ft || {}), info: jest.fn().mockResolvedValue(undefined) };

			(MockCreateClient as any).mockReturnValue(mockClient);

			// Provide a base class method that ExtendedRedisVectorSearch will call via super
			const RedisVectorStoreMod: any = jest.requireMock('@langchain/redis');
			RedisVectorStoreMod.RedisVectorStore.prototype.similaritySearchVectorWithScore = jest
				.fn()
				.mockResolvedValue('ok');

			const context: any = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: (name: string) => {
					const map: Record<string, any> = {
						redisIndex: 'myIndex',
						'options.keyPrefix': 'doc',
						'options.metadataKey': 'm',
						'options.contentKey': 'c',
						'options.vectorKey': 'v',
						'options.metadataFilter': 'a,b',
					};
					return map[name];
				},
				getNode: () => ({ name: 'VectorStoreRedis' }),
				logger: loadOptionsFunctions.logger,
			} as any;

			const embeddings: any = {};
			const instance = new RedisNode.VectorStoreRedis();
			const client = await (instance as any).getVectorStoreClient(
				context,
				undefined,
				embeddings,
				0,
			);

			// Ensure FT.INFO is called to validate index
			expect(mockClient.ft.info).toHaveBeenCalledWith('myIndex');

			// The base class constructor should have been called with embeddings and options
			const state = RedisVectorStoreMod.__state;
			expect(state.ctorArgs[0]).toBe(embeddings);
			expect(state.ctorArgs[1]).toMatchObject({
				redisClient: mockClient,
				indexName: 'myIndex',
				keyPrefix: 'doc',
				metadataKey: 'm',
				contentKey: 'c',
				vectorKey: 'v',
			});

			// Call the overridden method and ensure behavior is as expected
			const res = await client.similaritySearchVectorWithScore([1, 2], 3);
			expect(res).toBe('ok');
			// Validate filter tokens got captured on the instance
			expect(client.defaultFilter).toEqual(['a', 'b']);
		});

		it('trims and removes empty metadata filter tokens', async () => {
			const mockClient = {
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				disconnect: jest.fn(),
				quit: jest.fn(),
				ft: { info: jest.fn().mockResolvedValue(undefined) },
			} as any;

			(MockCreateClient as any).mockReturnValue(mockClient);

			const RedisVectorStoreMod: any = jest.requireMock('@langchain/redis');
			RedisVectorStoreMod.RedisVectorStore.prototype.similaritySearchVectorWithScore = jest
				.fn()
				.mockResolvedValue('ok');

			const context: any = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: (name: string) => {
					const map: Record<string, any> = {
						redisIndex: 'idx2',
						'options.keyPrefix': '',
						'options.metadataKey': '',
						'options.contentKey': '',
						'options.vectorKey': '',
						'options.metadataFilter': 'tag1, tag2 , ,tag3',
					};
					return map[name];
				},
				getNode: () => ({ name: 'VectorStoreRedis' }),
				logger: loadOptionsFunctions.logger,
			} as any;

			const node = new RedisNode.VectorStoreRedis();
			const client = await (node as any).getVectorStoreClient(context, undefined, {}, 0);

			// Ensure trimming/removal works
			expect(client.defaultFilter).toEqual(['tag1', 'tag2', 'tag3']);
		});

		it('omits optional keys when empty/whitespace and handles empty filter as null', async () => {
			const mockClient = {
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				disconnect: jest.fn(),
				quit: jest.fn(),
				ft: { info: jest.fn().mockResolvedValue(undefined) },
			} as any;

			(MockCreateClient as any).mockReturnValue(mockClient);

			const RedisVectorStoreMod: any = jest.requireMock('@langchain/redis');
			RedisVectorStoreMod.RedisVectorStore.prototype.similaritySearchVectorWithScore = jest
				.fn()
				.mockResolvedValue('ok');

			const context: any = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: (name: string) => {
					const map: Record<string, any> = {
						redisIndex: 'myIndex',
						'options.keyPrefix': '   ',
						'options.metadataKey': '  ',
						'options.contentKey': '',
						'options.vectorKey': ' \t',
						'options.metadataFilter': '',
					};
					return map[name];
				},
				getNode: () => ({ name: 'VectorStoreRedis' }),
				logger: loadOptionsFunctions.logger,
			} as any;

			const embeddings: any = {};
			const node = new RedisNode.VectorStoreRedis();
			const instance = await (node as any).getVectorStoreClient(context, undefined, embeddings, 0);

			// Ensure FT.INFO is called to validate index
			expect(mockClient.ft.info).toHaveBeenCalledWith('myIndex');

			const opts = RedisVectorStoreMod.__state.ctorArgs[1];
			expect(opts).toMatchObject({ redisClient: mockClient, indexName: 'myIndex' });
			expect(opts).not.toHaveProperty('keyPrefix');
			expect(opts).not.toHaveProperty('metadataKey');
			expect(opts).not.toHaveProperty('contentKey');
			expect(opts).not.toHaveProperty('vectorKey');

			const res = await instance.similaritySearchVectorWithScore([0], 1);
			expect(res).toBeDefined();
			expect(instance.defaultFilter).toBeUndefined();
		});

		it('returns undefined filter when filter string contains only whitespace and commas', async () => {
			const mockClient = {
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				disconnect: jest.fn(),
				quit: jest.fn(),
				ft: { info: jest.fn().mockResolvedValue(undefined) },
			} as any;

			(MockCreateClient as any).mockReturnValue(mockClient);

			const RedisVectorStoreMod: any = jest.requireMock('@langchain/redis');
			RedisVectorStoreMod.RedisVectorStore.prototype.similaritySearchVectorWithScore = jest
				.fn()
				.mockResolvedValue('ok');

			const context: any = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: (name: string) => {
					const map: Record<string, any> = {
						redisIndex: 'myIndex',
						'options.keyPrefix': '',
						'options.metadataKey': '',
						'options.contentKey': '',
						'options.vectorKey': '',
						'options.metadataFilter': '  , , ,  ',
					};
					return map[name];
				},
				getNode: () => ({ name: 'VectorStoreRedis' }),
				logger: loadOptionsFunctions.logger,
			} as any;

			const node = new RedisNode.VectorStoreRedis();
			const instance = await (node as any).getVectorStoreClient(context, undefined, {}, 0);

			// Filter with only whitespace and commas should result in undefined
			expect(instance.defaultFilter).toBeUndefined();
		});

		it('throws NodeOperationError when index is missing', async () => {
			const mockClient = {
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				disconnect: jest.fn(),
				quit: jest.fn(),
				ft: { info: jest.fn().mockRejectedValue(new Error('no such index')) },
			} as any;
			(MockCreateClient as any).mockReturnValue(mockClient);

			const context: any = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: (name: string) => (name === 'redisIndex' ? 'idx' : ''),
				getNode: () => ({ name: 'VectorStoreRedis' }),
			};

			const node = new RedisNode.VectorStoreRedis();
			await expect((node as any).getVectorStoreClient(context, undefined, {}, 0)).rejects.toEqual(
				new NodeOperationError(context.getNode(), 'Index idx not found', {
					itemIndex: 0,
					description: 'Please check that the index exists in your Redis instance',
				}),
			);
		});
	});

	describe('populateVectorStore', () => {
		it('drops index and deletes the documents when overwrite is true; passes TTL and batch size', async () => {
			const mockClient = {
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				disconnect: jest.fn(),
				quit: jest.fn(),
				ft: { dropIndex: jest.fn().mockResolvedValue(undefined) },
			} as any;
			(MockCreateClient as any).mockReturnValue(mockClient);

			const RedisVectorStoreMod: any = jest.requireMock('@langchain/redis');
			RedisVectorStoreMod.RedisVectorStore.fromDocuments = jest.fn().mockResolvedValue(undefined);

			const context: any = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: (name: string) => {
					const map: Record<string, any> = {
						redisIndex: 'myIndex',
						'options.overwriteDocuments': true,
						'options.keyPrefix': 'doc',
						'options.metadataKey': 'm',
						'options.contentKey': 'c',
						'options.vectorKey': 'v',
						'options.ttl': 60,
						embeddingBatchSize: 123,
					};
					return map[name];
				},
				getNode: () => ({ name: 'VectorStoreRedis' }),
				logger: loadOptionsFunctions.logger,
			} as any;

			const node = new RedisNode.VectorStoreRedis();
			await (node as any).populateVectorStore(
				context,
				{},
				[{ pageContent: 'hello', metadata: {} }],
				0,
			);

			expect(mockClient.ft.dropIndex).toHaveBeenCalledWith('myIndex', { DD: true });

			expect(RedisVectorStoreMod.RedisVectorStore.fromDocuments).toHaveBeenCalledWith(
				[{ pageContent: 'hello', metadata: {} }],
				{},
				{
					redisClient: mockClient,
					indexName: 'myIndex',
					keyPrefix: 'doc',
					metadataKey: 'm',
					contentKey: 'c',
					vectorKey: 'v',
					ttl: 60,
				},
			);
		});

		it('logs and throws NodeOperationError on failure', async () => {
			const mockClient = {
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				disconnect: jest.fn(),
				quit: jest.fn(),
				sendCommand: jest.fn().mockResolvedValue(undefined),
			} as any;
			(MockCreateClient as any).mockReturnValue(mockClient);

			const RedisVectorStoreMod: any = jest.requireMock('@langchain/redis');
			RedisVectorStoreMod.RedisVectorStore.fromDocuments = jest
				.fn()
				.mockRejectedValue(new Error('fail'));

			const context: any = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: (name: string) => (name === 'redisIndex' ? 'idx' : ''),
				getNode: () => ({ name: 'VectorStoreRedis' }),
				logger: loadOptionsFunctions.logger,
			} as any;

			const node = new RedisNode.VectorStoreRedis();
			await expect((node as any).populateVectorStore(context, {}, [], 0)).rejects.toEqual(
				new NodeOperationError(context.getNode(), 'Error: fail', {
					itemIndex: 0,
					description: 'Please check your index/schema and parameters',
				}),
			);

			expect(loadOptionsFunctions.logger.info).toHaveBeenCalledWith(
				'Error while populating the store: fail',
			);
		});
	});
});
