// cspell:ignore langchain vectorstores vectorstore oracledb XEPDB
import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { VectorStoreNodeConstructorArgs } from '@n8n/ai-utilities';
import { ConnectionPoolManager } from 'n8n-nodes-base/dist/utils/connection-pool-manager';
import type { IExecuteFunctions } from 'n8n-workflow';
import type { Pool } from 'oracledb';

type OracleFilter = Record<string, unknown>;

type OracleVSStubArgs = {
	filter?: OracleFilter;
	client?: unknown;
	[key: string]: unknown;
};

type VectorSearchResult = Array<[Document<Record<string, unknown>>, number]>;

type InitializeFn = (embeddings: Embeddings, args: OracleVSStubArgs) => void;
type FromDocumentsFn = (
	documents: Array<Document<Record<string, unknown>>>,
	embeddings: Embeddings,
	config: Record<string, unknown>,
) => Promise<void>;
type AddDocumentsFn = (
	documents: Array<Document<Record<string, unknown>>>,
	options?: unknown,
) => Promise<void>;
type SimilaritySearchFn = (
	query: number[],
	k: number,
	filter?: OracleFilter,
) => Promise<VectorSearchResult>;
type AsyncCloseMock = ReturnType<typeof vi.fn<() => Promise<void>>>;
type MockOracleConnection = {
	close: AsyncCloseMock;
};
type MockOraclePool = {
	close: AsyncCloseMock;
	connectionsOpen: number;
	getConnection: ReturnType<typeof vi.fn<() => Promise<MockOracleConnection>>>;
};
type ManagedPoolCache = Map<string, Pool>;
type OracleVSStubInstance = VectorStore & {
	filter?: OracleFilter;
	client: unknown;
	readonly embeddings: Embeddings;
	initialize: () => Promise<void>;
	similaritySearchVectorWithScore: SimilaritySearchFn;
};
type OracleVSStubConstructor = {
	new (embeddings: Embeddings, args: OracleVSStubArgs): OracleVSStubInstance;
	instances: OracleVSStubInstance[];
	fromDocuments: (
		documents: Array<Document<Record<string, unknown>>>,
		embeddings: Embeddings,
		config: Record<string, unknown>,
	) => Promise<OracleVSStubInstance>;
};

const {
	poolCloseMocks,
	createdPools,
	connectionCloseMocks,
	managedPoolCache,
	mockCreatePool,
	mockInitOracleClient,
	initializeSpy,
	fromDocumentsSpy,
	similaritySearchSpy,
	DistanceStrategyMock,
	OracleVSStub,
} = vi.hoisted(() => {
	const poolCloseMocks: AsyncCloseMock[] = [];
	const createdPools: Pool[] = [];
	const connectionCloseMocks: AsyncCloseMock[] = [];
	const managedPoolCache: ManagedPoolCache = new Map();
	const mockCreatePool = vi.fn();
	const mockInitOracleClient = vi.fn();
	const initializeSpy = vi.fn<InitializeFn>((embeddings, args) => {
		void embeddings;
		void args;
	});
	const fromDocumentsSpy = vi.fn<FromDocumentsFn>(async (documents, embeddings, config) => {
		await Promise.resolve();
		void documents;
		void embeddings;
		void config;
	});
	const addDocumentsSpy = vi.fn<AddDocumentsFn>(async (documents, options) => {
		await Promise.resolve();
		void documents;
		void options;
	});
	const similaritySearchSpy = vi.fn<SimilaritySearchFn>(async (query, k, filter) => {
		await Promise.resolve();
		void query;
		void k;
		void filter;
		return [];
	});

	const DistanceStrategyMock = {
		COSINE: 'COSINE',
		DOT_PRODUCT: 'DOT',
		EUCLIDEAN: 'EUCLIDEAN',
		MANHATTAN: 'MANHATTAN',
		EUCLIDEAN_SQUARED: 'EUCLIDEAN_SQUARED',
		HAMMING: 'HAMMING',
	} as const;

	class OracleVSStub {
		static instances: OracleVSStub[] = [];

		filter?: OracleFilter;

		client: unknown;

		readonly embeddings: Embeddings;

		private readonly args: OracleVSStubArgs;

		constructor(embeddings: Embeddings, args: OracleVSStubArgs) {
			this.embeddings = embeddings;
			this.args = args;
			this.filter = args.filter;
			this.client = args.client;
			OracleVSStub.instances.push(this);
		}

		async initialize(): Promise<void> {
			initializeSpy(this.embeddings, this.args);
			const client = this.client as {
				getConnection?: () => Promise<{ close?: () => Promise<void> }>;
			};
			if (client?.getConnection) {
				const connection = await client.getConnection();
				if (connection && typeof connection.close === 'function') {
					await connection.close();
				}
			}
			await Promise.resolve();
		}

		_vectorstoreType(): string {
			return 'oracle-stub';
		}

		async addVectors(
			vectors: number[][],
			documents: Array<Document<Record<string, unknown>>>,
			options?: Record<string, unknown>,
		): Promise<void> {
			void vectors;
			void documents;
			void options;
			await Promise.resolve();
		}

		async addDocuments(
			documents: Array<Document<Record<string, unknown>>>,
			options?: unknown,
		): Promise<void> {
			await addDocumentsSpy(documents, options);
		}

		async similaritySearchVectorWithScore(
			query: number[],
			k: number,
			filter?: OracleFilter,
		): Promise<VectorSearchResult> {
			return await similaritySearchSpy(query, k, filter);
		}

		static async fromDocuments(
			documents: Array<Document<Record<string, unknown>>>,
			embeddings: Embeddings,
			config: Record<string, unknown>,
		): Promise<OracleVSStub> {
			const client = (config as OracleVSStubArgs).client as {
				getConnection?: () => Promise<{ close?: () => Promise<void> }>;
			};
			if (client?.getConnection) {
				const connection = await client.getConnection();
				if (connection && typeof connection.close === 'function') {
					await connection.close();
				}
			}
			await fromDocumentsSpy(documents, embeddings, config);
			return new OracleVSStub(embeddings, config as OracleVSStubArgs);
		}
	}

	return {
		poolCloseMocks,
		createdPools,
		connectionCloseMocks,
		managedPoolCache,
		mockCreatePool,
		mockInitOracleClient,
		initializeSpy,
		fromDocumentsSpy,
		similaritySearchSpy,
		DistanceStrategyMock,
		OracleVSStub: OracleVSStub as unknown as OracleVSStubConstructor,
	};
});

vi.mock('oracledb', () => ({
	__esModule: true,
	default: {
		createPool: mockCreatePool,
		initOracleClient: mockInitOracleClient,
	},
	createPool: mockCreatePool,
	initOracleClient: mockInitOracleClient,
}));

vi.mock('n8n-nodes-base/dist/nodes/Oracle/Sql/transport', () => ({
	configureOracleDB: vi.fn(async (credentials: Record<string, unknown>) => {
		const cacheKey = JSON.stringify(credentials);
		const cachedPool = managedPoolCache.get(cacheKey);
		if (cachedPool) return cachedPool;

		const { useThickMode, ...poolConfig } = credentials;
		void useThickMode;
		const pool = (await mockCreatePool(poolConfig)) as Pool;
		managedPoolCache.set(cacheKey, pool);
		return pool;
	}),
}));

vi.mock('@oracle/langchain-oracledb', () => ({
	DistanceStrategy: DistanceStrategyMock,
	OracleVS: OracleVSStub,
}));

type TestNodeInstance = {
	getVectorStoreClient: (
		context: IExecuteFunctions,
		filter: OracleFilter | undefined,
		embeddings: Embeddings,
		itemIndex: number,
	) => Promise<OracleVSStubInstance>;
	populateVectorStore: (
		context: IExecuteFunctions,
		embeddings: Embeddings,
		documents: Array<Document<Record<string, unknown>>>,
		itemIndex: number,
	) => Promise<void>;
};

type ReleaseVectorStoreClient = ((vectorStore: OracleVSStubInstance) => void) | undefined;
let capturedReleaseVectorStoreClient: ReleaseVectorStoreClient;
let capturedConfig: VectorStoreNodeConstructorArgs<OracleVSStubInstance> | undefined;

type CreateVectorStoreNode = <T extends VectorStore = VectorStore>(
	args: VectorStoreNodeConstructorArgs<T>,
) => new () => TestNodeInstance;

vi.mock('@n8n/ai-utilities', () => {
	const createVectorStoreNodeOverride: CreateVectorStoreNode = <
		T extends VectorStore = VectorStore,
	>(
		config: VectorStoreNodeConstructorArgs<T>,
	) => {
		const releaseVectorStoreClient =
			config.meta?.name === 'vectorStoreOracleDBVector' &&
			typeof config.releaseVectorStoreClient === 'function'
				? (config.releaseVectorStoreClient as (vectorStore: T) => void)
				: undefined;

		class TestVectorStoreNode implements TestNodeInstance {
			constructor(...args: []) {
				void args;
				if (releaseVectorStoreClient) {
					capturedReleaseVectorStoreClient = (vectorStore: OracleVSStubInstance) =>
						releaseVectorStoreClient(vectorStore as unknown as T);
				} else {
					capturedReleaseVectorStoreClient = undefined;
				}
				capturedConfig = config as unknown as VectorStoreNodeConstructorArgs<OracleVSStubInstance>;
			}

			async getVectorStoreClient(
				context: IExecuteFunctions,
				filter: OracleFilter | undefined,
				embeddings: Embeddings,
				itemIndex: number,
			): Promise<OracleVSStubInstance> {
				if (!capturedConfig) throw new Error('Vector store config not captured');
				const vectorStore = await capturedConfig.getVectorStoreClient(
					context,
					filter as Record<string, never> | undefined,
					embeddings,
					itemIndex,
				);
				return vectorStore;
			}

			async populateVectorStore(
				context: IExecuteFunctions,
				embeddings: Embeddings,
				docs: Array<Document<Record<string, unknown>>>,
				itemIndex: number,
			): Promise<void> {
				if (!capturedConfig) throw new Error('Vector store config not captured');
				await capturedConfig.populateVectorStore(context, embeddings, docs, itemIndex);
			}
		}

		return TestVectorStoreNode;
	};

	return {
		metadataFilterField: {},
		createVectorStoreNode: createVectorStoreNodeOverride,
	};
});

import { VectorStoreOracleDB } from './VectorStoreOracleDB.node';

describe('VectorStoreOracleDB.node', () => {
	const context = {
		getNodeParameter: jest.fn(),
		getCredentials: jest.fn(),
		logger: {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
		},
	} as unknown as jest.Mocked<IExecuteFunctions>;

	const embeddings = {} as Embeddings;
	const documents: Array<Document<Record<string, unknown>>> = [
		{ pageContent: 'first', metadata: { id: 1 } },
		{ pageContent: 'second', metadata: { id: 2 } },
	];
	const baseCredentials = {
		connectionString: 'oracle://localhost:1521/XEPDB1',
		user: 'user',
		password: 'pw',
		useThickMode: false,
		useSSL: false,
		poolMin: 0,
		poolMax: 4,
		poolIncrement: 1,
		poolTimeout: 60,
		maxLifetimeSession: 60,
		privilege: undefined,
	};

	const defaultGetNodeParameter = (name: string) => {
		if (name === 'tableName') return 'n8n_vectors';
		if (name === 'options.distanceStrategy') return DistanceStrategyMock.DOT_PRODUCT;
		return undefined;
	};

	const createNode = () => new VectorStoreOracleDB() as unknown as TestNodeInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		createdPools.length = 0;
		poolCloseMocks.length = 0;
		connectionCloseMocks.length = 0;
		managedPoolCache.clear();
		capturedConfig = undefined;
		capturedReleaseVectorStoreClient = undefined;

		mockCreatePool.mockImplementation(async () => {
			await Promise.resolve();
			const createConnection = () => {
				const connection = {
					close: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
				};
				connectionCloseMocks.push(connection.close);
				return connection;
			};
			const pool: MockOraclePool = {
				close: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
				connectionsOpen: 0,
				getConnection: vi.fn<() => Promise<MockOracleConnection>>(async () => {
					await Promise.resolve();
					return createConnection();
				}),
			};
			createdPools.push(pool as unknown as Pool);
			poolCloseMocks.push(pool.close);
			return pool as unknown as Pool;
		});

		context.getCredentials.mockImplementation(async () => {
			await Promise.resolve();
			return { ...baseCredentials };
		});
		context.getNodeParameter.mockImplementation(defaultGetNodeParameter);
		OracleVSStub.instances = [];
		similaritySearchSpy.mockClear();
		mockInitOracleClient.mockClear();
		ConnectionPoolManager.getInstance(context.logger).purgeConnections();
	});

	it('passes configuration to ExtendedOracleDBVectorStore.initialize', async () => {
		const node = createNode();
		const filter: OracleFilter = { project: 'n8n' };

		const vectorStore = await node.getVectorStoreClient(context, filter, embeddings, 0);

		expect(mockCreatePool).toHaveBeenCalledTimes(1);
		expect(createdPools).toHaveLength(1);
		const poolConfig = mockCreatePool.mock.calls[0]![0];
		expect(poolConfig).toMatchObject({
			user: 'user',
			password: 'pw',
			connectionString: baseCredentials.connectionString,
		});
		expect(poolConfig).not.toHaveProperty('useThickMode');

		expect(initializeSpy).toHaveBeenCalledTimes(1);
		const firstInitializeCall = initializeSpy.mock.calls[0];
		if (!firstInitializeCall) {
			throw new Error('initializeSpy should have been called');
		}
		const [, initArgs] = firstInitializeCall;
		expect(initArgs).toMatchObject({
			client: vectorStore.client,
			tableName: 'n8n_vectors',
			query: 'n8n vector store initialization text',
			filter,
			distanceStrategy: DistanceStrategyMock.DOT_PRODUCT,
		});
		expect(vectorStore).toBeInstanceOf(OracleVSStub);
	});

	describe.each(Object.entries(DistanceStrategyMock))(
		'sets distance strategy to %s',
		(strategyName, strategyValue) => {
			it(`uses ${strategyName} distance strategy`, async () => {
				const node = createNode();
				context.getNodeParameter.mockImplementation((name: string) => {
					if (name === 'tableName') return 'n8n_vectors';
					if (name === 'options.distanceStrategy') return strategyValue;
					return undefined;
				});

				await node.getVectorStoreClient(context, undefined, embeddings, 0);

				const lastCall = initializeSpy.mock.calls.at(-1);
				if (!lastCall) throw new Error('initializeSpy should have been called');
				const [, initArgs] = lastCall;
				expect(initArgs?.distanceStrategy).toBe(strategyValue);

				context.getNodeParameter.mockImplementation(defaultGetNodeParameter);
			});
		},
	);

	it('passes array metadata filters without $in operator', async () => {
		const node = createNode();
		const filter: OracleFilter = {
			author: ['Author1', 'Author2'],
		};

		await node.getVectorStoreClient(context, filter, embeddings, 0);

		const lastInitializeCall = initializeSpy.mock.calls.at(-1);
		if (!lastInitializeCall) {
			throw new Error('initializeSpy should have been called');
		}
		const [, initArgs] = lastInitializeCall;
		expect(initArgs?.filter).toEqual(filter);
	});

	it('passes metadata filters using $nin operator', async () => {
		const node = createNode();
		const filter: OracleFilter = {
			author: { $nin: ['Author1', 'Author2'] },
		};

		await node.getVectorStoreClient(context, filter, embeddings, 0);

		const lastInitializeCall = initializeSpy.mock.calls.at(-1);
		if (!lastInitializeCall) {
			throw new Error('initializeSpy should have been called');
		}
		const [, initArgs] = lastInitializeCall;
		expect(initArgs?.filter).toEqual(filter);
	});

	it('populates vector store using OracleVS.fromDocuments with proper config', async () => {
		const node = createNode();

		await node.populateVectorStore(context, embeddings, documents, 0);

		const firstCall = fromDocumentsSpy.mock.calls[0];
		if (!firstCall) {
			throw new Error('fromDocumentsSpy should have been called');
		}
		const [callDocuments, callEmbeddings, callConfig] = firstCall;
		expect(callDocuments).toBe(documents);
		expect(callEmbeddings).toBe(embeddings);
		expect(callConfig).toEqual(
			expect.objectContaining({
				tableName: 'n8n_vectors',
				query: 'n8n vector store initialization text',
			}),
		);

		expect(createdPools).toHaveLength(1);
		expect(callConfig.client).toEqual(
			expect.objectContaining({
				getConnection: expect.any(Function),
				close: expect.any(Function),
			}),
		);

		expect(connectionCloseMocks).toHaveLength(1);
		expect(connectionCloseMocks[0]).toHaveBeenCalled();
		expect(poolCloseMocks[0]).not.toHaveBeenCalled();
	});

	it('merges stored filter with ad-hoc filter for similarity search', async () => {
		const node = createNode();
		const baseFilter: OracleFilter = {
			$and: [{ project: 'n8n' }, { category: 'movies' }],
			nested: { flag: true },
		};
		const runtimeFilter: OracleFilter = {
			$and: [{ language: 'en' }],
			nested: { rating: { $gte: 4.5 } },
			author: 'Andrew Ng',
		};

		const vectorStore = await node.getVectorStoreClient(context, baseFilter, embeddings, 0);

		await vectorStore.similaritySearchVectorWithScore([0.1, 0.2], 3, runtimeFilter);

		expect(similaritySearchSpy).toHaveBeenCalledWith([0.1, 0.2], 3, {
			$and: [{ project: 'n8n' }, { category: 'movies' }, { language: 'en' }],
			nested: { flag: true, rating: { $gte: 4.5 } },
			author: 'Andrew Ng',
		});
	});

	it('returns borrowed connections while keeping the managed pool open', async () => {
		const node = createNode();
		await node.getVectorStoreClient(context, undefined, embeddings, 0);

		expect(mockCreatePool).toHaveBeenCalledTimes(1);
		expect(poolCloseMocks).toHaveLength(1);
		const poolClose = poolCloseMocks[0];
		expect(poolClose).toBeDefined();

		const lastInstance = OracleVSStub.instances.at(-1);
		if (!lastInstance) {
			throw new Error('Expected a vector store instance to be created');
		}

		if (!capturedReleaseVectorStoreClient) {
			throw new Error('releaseVectorStoreClient was not captured');
		}

		const clientCloseSpy = jest
			.spyOn(lastInstance.client as { close: () => Promise<void> }, 'close')
			.mockResolvedValue(undefined);

		expect(clientCloseSpy).not.toHaveBeenCalled();
		expect(poolClose).not.toHaveBeenCalled();

		capturedReleaseVectorStoreClient(lastInstance);
		expect(clientCloseSpy).toHaveBeenCalledTimes(1);
		expect(poolClose).not.toHaveBeenCalled();

		capturedReleaseVectorStoreClient(lastInstance);
		expect(clientCloseSpy).toHaveBeenCalledTimes(2);
		expect(poolClose).not.toHaveBeenCalled();
	});

	it('reuses the managed pool across vector store clients', async () => {
		const node = createNode();

		const firstVectorStore = await node.getVectorStoreClient(context, undefined, embeddings, 0);
		const secondVectorStore = await node.getVectorStoreClient(context, undefined, embeddings, 0);

		expect(mockCreatePool).toHaveBeenCalledTimes(1);
		expect(createdPools).toHaveLength(1);
		expect(firstVectorStore.client).not.toBe(createdPools[0]);
		expect(secondVectorStore.client).not.toBe(createdPools[0]);
		expect(connectionCloseMocks).toHaveLength(2);
		expect(connectionCloseMocks[0]).toHaveBeenCalledTimes(1);
		expect(connectionCloseMocks[1]).toHaveBeenCalledTimes(1);
		expect(poolCloseMocks[0]).not.toHaveBeenCalled();
	});
});
