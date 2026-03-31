import { mock } from 'jest-mock-extended';
import { NodeOperationError, type ILoadOptionsFunctions } from 'n8n-workflow';

// Mock external modules that are not needed for these unit tests
jest.mock('@langchain/redis', () => {
	const state: any = { ctorArgs: undefined, filterExpression: undefined };
	// Legacy RedisVectorStore for v1.3 and below
	class RedisVectorStore {
		static fromDocuments = jest.fn();
		defaultFilter?: string[];
		constructor(...args: any[]) {
			state.legacyCtorArgs = args;
		}
		async similaritySearchVectorWithScore(_query: number[], _k: number, _filter?: string[]) {
			return [];
		}
	}
	// New FluentRedisVectorStore for v1.4+
	class FluentRedisVectorStore {
		static fromDocuments = jest.fn();
		constructor(...args: any[]) {
			state.ctorArgs = args;
		}
	}
	// Mock filter builders - Tag.eq receives an array of values when called with array
	const Tag = (field: string) => ({
		eq: (values: string | string[]) => ({
			type: 'tag',
			field,
			values: Array.isArray(values) ? values : [values],
		}),
	});
	const Custom = (query: string) => ({ type: 'custom', query });
	// Mock inferMetadataSchema to return empty schema
	const inferMetadataSchema = jest.fn().mockReturnValue([]);
	return {
		RedisVectorStore,
		FluentRedisVectorStore,
		Tag,
		Custom,
		inferMetadataSchema,
		__state: state,
	};
});

jest.mock('@n8n/ai-utilities', () => ({
	metadataFilterField: {},
	getMetadataFiltersValues: jest.fn(),
	logAiEvent: jest.fn(),
	N8nBinaryLoader: class {},
	N8nJsonLoader: class {},
	logWrapper: (fn: any) => fn,
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
		it('constructs ExtendedRedisVectorSearch with correct options for v1.4', async () => {
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
			const FluentRedisVectorStoreMod: any = jest.requireMock('@langchain/redis');
			FluentRedisVectorStoreMod.FluentRedisVectorStore.prototype.similaritySearchVectorWithScore =
				jest.fn().mockResolvedValue('ok');

			const context: any = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: (name: string) => {
					const map: Record<string, any> = {
						redisIndex: 'myIndex',
						'options.keyPrefix': 'doc',
						'options.metadataKey': 'm',
						'options.contentKey': 'c',
						'options.vectorKey': 'v',
						'options.customFilter': '',
						'options.metadataSchema': '',
					};
					return map[name] ?? '';
				},
				getNode: () => ({ name: 'VectorStoreRedis', typeVersion: 1.4 }),
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
			const state = FluentRedisVectorStoreMod.__state;
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
			// v1.4 with no customFilter should have undefined filter
			expect(client.defaultFilter).toBeUndefined();
		});

		it('uses Custom filter when customFilter is provided', async () => {
			const mockClient = {
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				disconnect: jest.fn(),
				quit: jest.fn(),
				ft: { info: jest.fn().mockResolvedValue(undefined) },
			} as any;

			(MockCreateClient as any).mockReturnValue(mockClient);

			const FluentRedisVectorStoreMod: any = jest.requireMock('@langchain/redis');
			FluentRedisVectorStoreMod.FluentRedisVectorStore.prototype.similaritySearchVectorWithScore =
				jest.fn().mockResolvedValue('ok');

			const context: any = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: (name: string) => {
					const map: Record<string, any> = {
						redisIndex: 'myIndex',
						'options.keyPrefix': '',
						'options.metadataKey': '',
						'options.contentKey': '',
						'options.vectorKey': '',
						'options.metadataFilter': 'ignored',
						'options.customFilter': '@category:{electronics} @price:[0 100]',
						'options.metadataSchema': '',
					};
					return map[name] ?? '';
				},
				getNode: () => ({ name: 'VectorStoreRedis', typeVersion: 1.4 }),
				logger: loadOptionsFunctions.logger,
			} as any;

			const node = new RedisNode.VectorStoreRedis();
			const client = await (node as any).getVectorStoreClient(context, undefined, {}, 0);

			// Custom filter takes priority over simple filter
			expect(client.defaultFilter).toEqual({
				type: 'custom',
				query: '@category:{electronics} @price:[0 100]',
			});
		});

		it('trims and removes empty metadata filter tokens for legacy v1.3', async () => {
			const mockClient = {
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				disconnect: jest.fn(),
				quit: jest.fn(),
				ft: { info: jest.fn().mockResolvedValue(undefined) },
			} as any;

			(MockCreateClient as any).mockReturnValue(mockClient);

			const LegacyRedisVectorStoreMod: any = jest.requireMock('@langchain/redis');
			LegacyRedisVectorStoreMod.RedisVectorStore.prototype.similaritySearchVectorWithScore = jest
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
					return map[name] ?? '';
				},
				getNode: () => ({ name: 'VectorStoreRedis', typeVersion: 1.3 }),
				logger: loadOptionsFunctions.logger,
			} as any;

			const node = new RedisNode.VectorStoreRedis();
			const client = await (node as any).getVectorStoreClient(context, undefined, {}, 0);

			// Legacy v1.3 uses string[] filter - verify trimming/removal works
			expect(client.defaultFilter).toEqual(['tag1', 'tag2', 'tag3']);
		});

		it('omits optional keys when empty/whitespace and handles empty filter as undefined', async () => {
			const mockClient = {
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				disconnect: jest.fn(),
				quit: jest.fn(),
				ft: { info: jest.fn().mockResolvedValue(undefined) },
			} as any;

			(MockCreateClient as any).mockReturnValue(mockClient);

			const FluentRedisVectorStoreMod: any = jest.requireMock('@langchain/redis');
			FluentRedisVectorStoreMod.FluentRedisVectorStore.prototype.similaritySearchVectorWithScore =
				jest.fn().mockResolvedValue('ok');

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
						'options.customFilter': '',
						'options.metadataSchema': '',
					};
					return map[name] ?? '';
				},
				getNode: () => ({ name: 'VectorStoreRedis', typeVersion: 1.4 }),
				logger: loadOptionsFunctions.logger,
			} as any;

			const embeddings: any = {};
			const node = new RedisNode.VectorStoreRedis();
			const instance = await (node as any).getVectorStoreClient(context, undefined, embeddings, 0);

			// Ensure FT.INFO is called to validate index
			expect(mockClient.ft.info).toHaveBeenCalledWith('myIndex');

			const opts = FluentRedisVectorStoreMod.__state.ctorArgs[1];
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

			const FluentRedisVectorStoreMod: any = jest.requireMock('@langchain/redis');
			FluentRedisVectorStoreMod.FluentRedisVectorStore.prototype.similaritySearchVectorWithScore =
				jest.fn().mockResolvedValue('ok');

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
						'options.customFilter': '',
						'options.metadataSchema': '',
					};
					return map[name] ?? '';
				},
				getNode: () => ({ name: 'VectorStoreRedis', typeVersion: 1.4 }),
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
				getNode: () => ({ name: 'VectorStoreRedis', typeVersion: 1.4 }),
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
		it('drops index and deletes the documents when overwrite is true; passes TTL and custom schema', async () => {
			const mockClient = {
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				disconnect: jest.fn(),
				quit: jest.fn(),
				ft: { dropIndex: jest.fn().mockResolvedValue(undefined) },
			} as any;
			(MockCreateClient as any).mockReturnValue(mockClient);

			const FluentRedisVectorStoreMod: any = jest.requireMock('@langchain/redis');
			FluentRedisVectorStoreMod.FluentRedisVectorStore.fromDocuments = jest
				.fn()
				.mockResolvedValue(undefined);

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
						'options.metadataSchema': '',
						embeddingBatchSize: 123,
					};
					return map[name] ?? '';
				},
				getNode: () => ({ name: 'VectorStoreRedis', typeVersion: 1.4 }),
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

			expect(FluentRedisVectorStoreMod.FluentRedisVectorStore.fromDocuments).toHaveBeenCalledWith(
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

		it('passes custom metadata schema when provided', async () => {
			const mockClient = {
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				disconnect: jest.fn(),
				quit: jest.fn(),
				ft: { dropIndex: jest.fn().mockResolvedValue(undefined) },
			} as any;
			(MockCreateClient as any).mockReturnValue(mockClient);

			const FluentRedisVectorStoreMod: any = jest.requireMock('@langchain/redis');
			FluentRedisVectorStoreMod.FluentRedisVectorStore.fromDocuments = jest
				.fn()
				.mockResolvedValue(undefined);

			const customSchema = [
				{ name: 'category', type: 'tag' },
				{ name: 'price', type: 'numeric', options: { sortable: true } },
			];

			const context: any = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: (name: string) => {
					const map: Record<string, any> = {
						redisIndex: 'myIndex',
						'options.overwriteDocuments': false,
						'options.keyPrefix': '',
						'options.metadataKey': '',
						'options.contentKey': '',
						'options.vectorKey': '',
						'options.ttl': 0,
						'options.metadataSchema': JSON.stringify(customSchema),
					};
					return map[name] ?? '';
				},
				getNode: () => ({ name: 'VectorStoreRedis', typeVersion: 1.4 }),
				logger: loadOptionsFunctions.logger,
			} as any;

			const node = new RedisNode.VectorStoreRedis();
			await (node as any).populateVectorStore(
				context,
				{},
				[{ pageContent: 'test', metadata: {} }],
				0,
			);

			expect(FluentRedisVectorStoreMod.FluentRedisVectorStore.fromDocuments).toHaveBeenCalledWith(
				[{ pageContent: 'test', metadata: {} }],
				{},
				expect.objectContaining({
					customSchema,
				}),
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

			const FluentRedisVectorStoreMod: any = jest.requireMock('@langchain/redis');
			FluentRedisVectorStoreMod.FluentRedisVectorStore.fromDocuments = jest
				.fn()
				.mockRejectedValue(new Error('fail'));

			const context: any = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: (name: string) => (name === 'redisIndex' ? 'idx' : ''),
				getNode: () => ({ name: 'VectorStoreRedis', typeVersion: 1.4 }),
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
