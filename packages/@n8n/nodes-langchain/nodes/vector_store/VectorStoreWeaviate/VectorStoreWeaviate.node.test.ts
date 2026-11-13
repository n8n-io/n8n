import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import { Document as LcDocument } from '@langchain/core/documents';
import { WeaviateStore } from '@langchain/weaviate';
import type { IDataObject, INode, ISupplyDataFunctions } from 'n8n-workflow';
import { UnexpectedError, UserError } from '@n8n/errors';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';
import weaviate, { type WeaviateClient } from 'weaviate-client';

const store = vi.hoisted(() => ({
	fromExistingIndex: vi.fn(),
	similaritySearchVectorWithScore: vi.fn(),
	hybridSearch: vi.fn(),
	addVectors: vi.fn(),
	returnForeignInstance: false,
}));

vi.mock('@langchain/weaviate', async () => {
	const actual = await vi.importActual<typeof import('@langchain/weaviate')>('@langchain/weaviate');
	class WeaviateStore {
		static async fromExistingIndex(...args: unknown[]) {
			store.fromExistingIndex(...args);
			return store.returnForeignInstance ? new WeaviateStore() : new this();
		}
		// Like LangChain: create an instance of the called class, then add the documents
		static fromDocuments = vi.fn(async function (
			this: new (
				...args: unknown[]
			) => { addVectors: (...args: unknown[]) => Promise<string[]> },
			documents: unknown[],
			embeddings: unknown,
			args: unknown,
		) {
			const instance = new this(embeddings, args);
			await instance.addVectors(
				documents.map(() => [0.5]),
				documents,
			);
			return instance;
		});
		// Prototype methods, so the subclass overrides still call them through `super`.
		async similaritySearchVectorWithScore(...args: unknown[]) {
			return await store.similaritySearchVectorWithScore(...args);
		}
		async hybridSearch(...args: unknown[]) {
			return await store.hybridSearch(...args);
		}
		async addVectors(...args: unknown[]) {
			return await store.addVectors(...args);
		}
	}
	return { WeaviateStore, flattenObjectForWeaviate: actual.flattenObjectForWeaviate };
});

vi.mock('@n8n/ai-utilities', () => ({
	createVectorStoreNode: (config: {
		getVectorStoreClient: (...args: unknown[]) => unknown;
		populateVectorStore: (...args: unknown[]) => unknown;
		beforeInsert: (...args: unknown[]) => unknown;
	}) =>
		class BaseNode {
			getVectorStoreClient = config.getVectorStoreClient;
			populateVectorStore = config.populateVectorStore;
			beforeInsert = config.beforeInsert;
		},
}));

vi.mock('../shared/methods/listSearch', () => ({ weaviateCollectionsSearch: vi.fn() }));
vi.mock('../shared/descriptions', () => ({ weaviateCollectionRLC: {} }));

import { VectorStoreWeaviate } from './VectorStoreWeaviate.node';
import { parseCompositeFilter } from './Weaviate.utils';

type TestNode = {
	getVectorStoreClient: (
		context: ISupplyDataFunctions,
		filter: IDataObject | undefined,
		embeddings: Embeddings,
		itemIndex: number,
	) => Promise<unknown>;
	populateVectorStore: (
		context: ISupplyDataFunctions,
		embeddings: Embeddings,
		documents: Document[],
		itemIndex: number,
	) => Promise<void>;
	beforeInsert: (
		context: ISupplyDataFunctions,
		embeddings: Embeddings,
		itemIndex: number,
	) => Promise<void>;
};

const CREDENTIAL_PROXY = 'http://credential-proxy.test:3128';
const NODE_PROXY = 'http://node-proxy.test:3128';

const baseCredentials = {
	weaviate_api_key: 'test-api-key',
	custom_connection_http_host: '127.0.0.1',
	custom_connection_http_port: 1,
	custom_connection_http_secure: false,
	custom_connection_grpc_host: '127.0.0.1',
	custom_connection_grpc_port: 2,
	custom_connection_grpc_secure: false,
};

function createContext(
	options: Record<string, unknown>,
	credentials: Record<string, unknown> = {},
	typeVersion = 1.4,
) {
	const context = mock<ISupplyDataFunctions>();
	context.getNode.mockReturnValue(mock<INode>({ name: 'Weaviate', typeVersion }));
	context.getNodeParameter.mockImplementation((name: string) =>
		name === 'options' ? { skip_init_checks: true, ...options } : 'TestCollection',
	);
	context.getCredentials.mockResolvedValue({ ...baseCredentials, ...credentials });
	return context;
}

describe('VectorStoreWeaviate.node', () => {
	const originalGrpcProxy = process.env.grpc_proxy;
	const node = new VectorStoreWeaviate() as unknown as TestNode;
	let connectSpy: MockInstance<typeof weaviate.connectToCustom>;

	const getClient = async (
		options: Record<string, unknown>,
		credentials?: Record<string, unknown>,
	) =>
		await node.getVectorStoreClient(
			createContext(options, credentials),
			undefined,
			mock<Embeddings>(),
			0,
		);

	const usedProxies = () => connectSpy.mock.calls.map(([params]) => params.proxies?.grpc);

	beforeEach(() => {
		delete process.env.grpc_proxy;
		connectSpy = vi.spyOn(weaviate, 'connectToCustom');
		store.returnForeignInstance = false;
		store.fromExistingIndex.mockClear();
		store.similaritySearchVectorWithScore.mockReset();
		store.hybridSearch.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		if (originalGrpcProxy === undefined) delete process.env.grpc_proxy;
		else process.env.grpc_proxy = originalGrpcProxy;
	});

	it('should connect without a proxy by default', async () => {
		await getClient({});

		expect(usedProxies()).toEqual([undefined]);
	});

	it('should use the gRPC proxy from the credential', async () => {
		await getClient({}, { custom_connection_grpc_proxy: CREDENTIAL_PROXY });

		expect(usedProxies()).toEqual([CREDENTIAL_PROXY]);
	});

	it('should prefer the credential gRPC proxy over the node option', async () => {
		await getClient({ proxy_grpc: NODE_PROXY }, { custom_connection_grpc_proxy: CREDENTIAL_PROXY });

		expect(usedProxies()).toEqual([CREDENTIAL_PROXY]);
	});

	it('should use the node option proxy when the gRPC connection is secure', async () => {
		await getClient({ proxy_grpc: NODE_PROXY }, { custom_connection_grpc_secure: true });

		expect(usedProxies()).toEqual([NODE_PROXY]);
	});

	it('should use the node option proxy when the credential has no API key', async () => {
		await getClient({ proxy_grpc: NODE_PROXY }, { weaviate_api_key: '' });

		expect(usedProxies()).toEqual([NODE_PROXY]);
	});

	it('should reject the node option proxy for an insecure gRPC connection with an API key', async () => {
		await expect(getClient({ proxy_grpc: NODE_PROXY })).rejects.toThrow(UserError);
		expect(connectSpy).not.toHaveBeenCalled();
	});

	it('should reject a gRPC proxy that is not an http:// URL', async () => {
		await expect(
			getClient({}, { custom_connection_grpc_proxy: 'https://credential-proxy.test:3128' }),
		).rejects.toThrow(UserError);
		expect(connectSpy).not.toHaveBeenCalled();
	});

	it('should use the credential gRPC proxy when it inserts documents', async () => {
		// Insert mode always runs the init checks, which need a live server
		connectSpy.mockResolvedValue(mock());

		await node.populateVectorStore(
			createContext({}, { custom_connection_grpc_proxy: CREDENTIAL_PROXY }),
			mock<Embeddings>(),
			[],
			0,
		);

		expect(usedProxies()).toEqual([CREDENTIAL_PROXY]);
	});

	it('should keep process proxy settings unchanged for parallel executions', async () => {
		await Promise.all([
			getClient({ proxy_grpc: NODE_PROXY }, { custom_connection_grpc_secure: true }),
			getClient({}, { custom_connection_grpc_proxy: CREDENTIAL_PROXY }),
			getClient({}),
		]);

		expect(usedProxies()).toEqual([NODE_PROXY, CREDENTIAL_PROXY, undefined]);
		expect(process.env.grpc_proxy).toBeUndefined();
	});

	type SearchableStore = {
		similaritySearchVectorWithScore: (
			query: number[],
			k: number,
			filter?: IDataObject,
		) => Promise<Array<[LcDocument, number]>>;
	};

	const getStore = async (options: Record<string, unknown>, filter?: IDataObject) =>
		(await node.getVectorStoreClient(
			createContext(options),
			filter,
			mock<Embeddings>(),
			0,
		)) as SearchableStore;

	const authorFilter = {
		OR: [{ path: ['author'], operator: 'Equal', valueString: 'Elis' }],
	};

	describe('getVectorStoreClient', () => {
		it('should pass the node options to the store and the client', async () => {
			await getClient({
				tenant: 'tenantA',
				textKey: 'content',
				metadataKeys: 'source,page',
				hybridQuery: 'cats',
				autoCutLimit: 2,
				alpha: 0.3,
				queryProperties: 'title, body',
				maxVectorDistance: 0.4,
				fusionType: 'Ranked',
				hybridExplainScore: true,
				timeout_init: 3,
				timeout_insert: 60,
				timeout_query: 20,
			});

			expect(connectSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					timeout: { init: 3, insert: 60, query: 20 },
					skipInitChecks: true,
				}),
			);
			expect(store.fromExistingIndex).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					indexName: 'TestCollection',
					tenant: 'tenantA',
					textKey: 'content',
					metadataKeys: ['source', 'page'],
					hybridQuery: 'cats',
					autoCutLimit: 2,
					alpha: 0.3,
					queryProperties: 'title, body',
					maxVectorDistance: 0.4,
					fusionType: 'Ranked',
					hybridExplainScore: true,
				}),
			);
		});

		it('should use the default values when the options are not set', async () => {
			await getClient({});

			expect(store.fromExistingIndex).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					tenant: undefined,
					textKey: 'text',
					metadataKeys: [],
					hybridQuery: undefined,
					maxVectorDistance: undefined,
					hybridExplainScore: false,
				}),
			);
		});

		it('should treat a max vector distance of 0 as not set', async () => {
			await getClient({ maxVectorDistance: 0 });

			expect(store.fromExistingIndex).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ maxVectorDistance: undefined }),
			);
		});

		it('should throw when the store factory returns a different class', async () => {
			store.returnForeignInstance = true;

			await expect(getClient({})).rejects.toThrow(UnexpectedError);
		});
	});

	describe('vector search', () => {
		it('should search without a filter when the node filter is empty', async () => {
			const vectorStore = await getStore({}, {});

			await vectorStore.similaritySearchVectorWithScore([0.1], 4);

			expect(store.similaritySearchVectorWithScore).toHaveBeenCalledWith([0.1], 4, undefined);
		});

		it('should use the node filter when the search has no filter', async () => {
			const vectorStore = await getStore({}, authorFilter);

			await vectorStore.similaritySearchVectorWithScore([0.1], 4);

			expect(store.similaritySearchVectorWithScore).toHaveBeenCalledWith(
				[0.1],
				4,
				parseCompositeFilter(authorFilter),
			);
		});

		it('should prefer the filter of the search over the node filter', async () => {
			const searchFilter = { AND: [{ path: ['year'], operator: 'LessThan', valueNumber: 2000 }] };
			const vectorStore = await getStore({}, authorFilter);

			await vectorStore.similaritySearchVectorWithScore([0.1], 4, searchFilter);

			expect(store.similaritySearchVectorWithScore).toHaveBeenCalledWith(
				[0.1],
				4,
				parseCompositeFilter(searchFilter),
			);
		});
	});

	describe('hybrid search', () => {
		const hybridOptions = {
			hybridQuery: 'cats',
			autoCutLimit: 2,
			alpha: 0.3,
			queryProperties: 'title , body',
			maxVectorDistance: 0.4,
			fusionType: 'Ranked',
			hybridExplainScore: true,
		};

		it('should send the hybrid options with the query vector', async () => {
			store.hybridSearch.mockResolvedValue([]);
			const vectorStore = await getStore(hybridOptions);

			await vectorStore.similaritySearchVectorWithScore([0.1, 0.2], 3);

			expect(store.hybridSearch).toHaveBeenCalledWith('cats', {
				limit: 3,
				autoLimit: 2,
				alpha: 0.3,
				vector: [0.1, 0.2],
				filters: undefined,
				queryProperties: ['title', 'body'],
				maxVectorDistance: 0.4,
				fusionType: 'Ranked',
				returnMetadata: ['explainScore'],
			});
		});

		it('should send the node filter to the hybrid search', async () => {
			store.hybridSearch.mockResolvedValue([]);
			const vectorStore = await getStore(hybridOptions, authorFilter);

			await vectorStore.similaritySearchVectorWithScore([0.1], 3);

			expect(store.hybridSearch).toHaveBeenCalledWith(
				'cats',
				expect.objectContaining({ filters: parseCompositeFilter(authorFilter) }),
			);
		});

		it('should not ask for the score explanation when it is turned off', async () => {
			store.hybridSearch.mockResolvedValue([]);
			const vectorStore = await getStore({ hybridQuery: 'cats' });

			await vectorStore.similaritySearchVectorWithScore([0.1], 3);

			expect(store.hybridSearch).toHaveBeenCalledWith(
				'cats',
				expect.objectContaining({ queryProperties: undefined, returnMetadata: undefined }),
			);
		});

		it('should return the score apart from the document metadata', async () => {
			store.hybridSearch.mockResolvedValue([
				new LcDocument({ pageContent: 'A cat', metadata: { source: 'a.pdf', score: 0.9 } }),
			]);
			const vectorStore = await getStore(hybridOptions);

			const results = await vectorStore.similaritySearchVectorWithScore([0.1], 3);

			expect(results).toEqual([
				[new LcDocument({ pageContent: 'A cat', metadata: { source: 'a.pdf' } }), 0.9],
			]);
		});

		it('should throw when the score is not a number', async () => {
			store.hybridSearch.mockResolvedValue([
				new LcDocument({ pageContent: 'A cat', metadata: { score: 'high' } }),
			]);
			const vectorStore = await getStore(hybridOptions);

			await expect(vectorStore.similaritySearchVectorWithScore([0.1], 3)).rejects.toThrow(
				'Unexpected score type: string',
			);
		});
	});

	describe('populateVectorStore', () => {
		const deleteCollection = vi.fn();
		const removeTenants = vi.fn();
		const closeClient = vi.fn();
		const client = mock<WeaviateClient>({
			close: closeClient,
			collections: mock<WeaviateClient['collections']>({
				delete: deleteCollection,
				get: vi.fn().mockReturnValue({ tenants: { remove: removeTenants } }),
			}),
		});
		const documents = [new LcDocument({ pageContent: 'A cat', metadata: {} })];
		const embeddings = mock<Embeddings>();

		const insert = async (options: Record<string, unknown>, typeVersion?: number) =>
			await node.populateVectorStore(
				createContext(options, {}, typeVersion),
				embeddings,
				documents,
				0,
			);

		beforeEach(() => {
			connectSpy.mockResolvedValue(client);
			deleteCollection.mockClear();
			removeTenants.mockClear();
			closeClient.mockClear();
			deleteCollection.mockReset();
			vi.mocked(WeaviateStore.fromDocuments).mockClear();
		});

		it('should insert the documents with the node options', async () => {
			await insert({ tenant: 'tenantA', textKey: 'content', metadataKeys: 'source,page' });

			expect(WeaviateStore.fromDocuments).toHaveBeenCalledWith(documents, embeddings, {
				client,
				indexName: 'TestCollection',
				tenant: 'tenantA',
				textKey: 'content',
				metadataKeys: ['source', 'page'],
				batchMode: 'auto',
			});
			expect(deleteCollection).not.toHaveBeenCalled();
		});

		it('should use the default text key and metadata keys', async () => {
			await insert({});

			expect(WeaviateStore.fromDocuments).toHaveBeenCalledWith(
				documents,
				embeddings,
				expect.objectContaining({ tenant: undefined, textKey: 'text', metadataKeys: [] }),
			);
		});

		it('should not clear the store in a batch, because beforeInsert does it', async () => {
			await insert({ clearStore: true });

			expect(deleteCollection).not.toHaveBeenCalled();
			expect(WeaviateStore.fromDocuments).toHaveBeenCalled();
		});

		it('should clear the store for each item in node version 1', async () => {
			await insert({ clearStore: true }, 1);

			expect(deleteCollection).toHaveBeenCalledWith('TestCollection');
		});

		describe('beforeInsert', () => {
			const clear = async (options: Record<string, unknown>) =>
				await node.beforeInsert(createContext(options), embeddings, 0);

			it('should do nothing when Clear Data is off', async () => {
				await clear({});

				expect(connectSpy).not.toHaveBeenCalled();
				expect(deleteCollection).not.toHaveBeenCalled();
			});

			it('should delete the collection when Clear Data is on', async () => {
				await clear({ clearStore: true });

				expect(deleteCollection).toHaveBeenCalledWith('TestCollection');
				expect(removeTenants).not.toHaveBeenCalled();
			});

			it('should remove only the tenant when Clear Data is on and a tenant is set', async () => {
				await clear({ clearStore: true, tenant: 'tenantA' });

				expect(removeTenants).toHaveBeenCalledWith([{ name: 'tenantA' }]);
				expect(deleteCollection).not.toHaveBeenCalled();
			});

			it('should close the client after the clear step', async () => {
				await clear({ clearStore: true });

				expect(closeClient).toHaveBeenCalledTimes(1);
			});

			it('should close the client when the clear step fails', async () => {
				deleteCollection.mockRejectedValueOnce(new Error('clear failed'));

				await expect(clear({ clearStore: true })).rejects.toThrow('clear failed');
				expect(closeClient).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('batch mode', () => {
		const ingest = vi.fn();
		const withTenant = vi.fn();
		const isAtLeast = vi.fn();
		const client = mock<WeaviateClient>({
			getWeaviateVersion: vi.fn().mockResolvedValue({ isAtLeast }),
			collections: mock<WeaviateClient['collections']>({
				get: vi.fn().mockReturnValue({ data: { ingest }, withTenant }),
			}),
		});
		const documents = [
			new LcDocument({ pageContent: 'A cat', metadata: { source: 'a.pdf', loc: { page: 1 } } }),
			new LcDocument({ pageContent: 'A dog', metadata: { source: 'b.pdf' } }),
		];

		const insert = async (options: Record<string, unknown>) =>
			await node.populateVectorStore(createContext(options), mock<Embeddings>(), documents, 0);

		const ingestedIds = () =>
			(ingest.mock.calls[0][0] as Array<{ id: string }>).map(({ id }) => id);

		beforeEach(() => {
			connectSpy.mockResolvedValue(client);
			isAtLeast.mockReset().mockReturnValue(true);
			ingest.mockReset().mockResolvedValue({ errors: {} });
			withTenant.mockReset().mockReturnValue({ data: { ingest } });
			store.addVectors.mockReset().mockResolvedValue([]);
		});

		it('should use the default insert in the default mode', async () => {
			await insert({ batchMode: 'default' });

			expect(store.addVectors).toHaveBeenCalledWith([[0.5], [0.5]], documents, undefined);
			expect(ingest).not.toHaveBeenCalled();
		});

		it('should stream the documents when Weaviate supports server-side batching', async () => {
			await insert({});

			expect(isAtLeast).toHaveBeenCalledWith(1, 36, 0);
			expect(ingest).toHaveBeenCalledWith([
				{
					id: expect.any(String),
					vectors: [0.5],
					properties: { text: 'A cat', source: 'a.pdf', loc_page: 1 },
				},
				{ id: expect.any(String), vectors: [0.5], properties: { text: 'A dog', source: 'b.pdf' } },
			]);
			expect(store.addVectors).not.toHaveBeenCalled();
		});

		it('should use the text key and the tenant of the node', async () => {
			await insert({ batchMode: 'serverSide', textKey: 'content', tenant: 'tenantA' });

			expect(withTenant).toHaveBeenCalledWith('tenantA');
			expect(ingest).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({ properties: expect.objectContaining({ content: 'A cat' }) }),
				]),
			);
		});

		it('should use the default insert with new IDs when Weaviate is older than v1.36', async () => {
			isAtLeast.mockReturnValue(false);

			await insert({ batchMode: 'auto' });

			expect(ingest).not.toHaveBeenCalled();
			expect(store.addVectors).toHaveBeenCalledWith([[0.5], [0.5]], documents, {
				ids: [expect.any(String), expect.any(String)],
			});
		});

		it('should retry with the same IDs in the default insert when the stream fails', async () => {
			ingest.mockRejectedValue(new Error('stream closed'));

			await insert({ batchMode: 'auto' });

			expect(store.addVectors).toHaveBeenCalledWith([[0.5], [0.5]], documents, {
				ids: ingestedIds(),
			});
		});

		it('should not retry when Weaviate rejects objects', async () => {
			ingest.mockResolvedValue({ errors: { 0: { message: 'invalid property' } } });

			await expect(insert({ batchMode: 'auto' })).rejects.toThrow(
				'Weaviate did not insert 1 of 2 objects: invalid property',
			);
			expect(store.addVectors).not.toHaveBeenCalled();
		});

		it('should throw and not insert when Weaviate is older than v1.36 in the server-side mode', async () => {
			isAtLeast.mockReturnValue(false);

			await expect(insert({ batchMode: 'serverSide' })).rejects.toThrow(
				'Server-side batching needs Weaviate 1.36 or later',
			);
			expect(ingest).not.toHaveBeenCalled();
			expect(store.addVectors).not.toHaveBeenCalled();
		});

		it('should throw and not retry when the stream fails in the server-side mode', async () => {
			ingest.mockRejectedValue(new Error('stream closed'));

			await expect(insert({ batchMode: 'serverSide' })).rejects.toThrow('stream closed');
			expect(store.addVectors).not.toHaveBeenCalled();
		});

		it('should throw when a document has an id in its metadata', async () => {
			const withId = [new LcDocument({ pageContent: 'A cat', metadata: { id: 'x' } })];

			await expect(
				node.populateVectorStore(
					createContext({ batchMode: 'serverSide' }),
					mock<Embeddings>(),
					withId,
					0,
				),
			).rejects.toThrow('must not have "id" in its metadata');
			expect(ingest).not.toHaveBeenCalled();
		});
	});
});
