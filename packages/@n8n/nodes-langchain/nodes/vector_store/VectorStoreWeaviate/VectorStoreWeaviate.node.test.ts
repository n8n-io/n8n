import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import { Document as LcDocument } from '@langchain/core/documents';
import type { IDataObject, INode, ISupplyDataFunctions } from 'n8n-workflow';
import { UnexpectedError, UserError } from '@n8n/errors';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';
import weaviate from 'weaviate-client';

const store = vi.hoisted(() => ({
	fromExistingIndex: vi.fn(),
	similaritySearchVectorWithScore: vi.fn(),
	hybridSearch: vi.fn(),
	returnForeignInstance: false,
}));

vi.mock('@langchain/weaviate', () => {
	class WeaviateStore {
		static async fromExistingIndex(...args: unknown[]) {
			store.fromExistingIndex(...args);
			return store.returnForeignInstance ? new WeaviateStore() : new this();
		}
		static fromDocuments = vi.fn();
		// Prototype methods, so the subclass overrides still call them through `super`.
		async similaritySearchVectorWithScore(...args: unknown[]) {
			return await store.similaritySearchVectorWithScore(...args);
		}
		async hybridSearch(...args: unknown[]) {
			return await store.hybridSearch(...args);
		}
	}
	return { WeaviateStore };
});

vi.mock('@n8n/ai-utilities', () => ({
	createVectorStoreNode: (config: {
		getVectorStoreClient: (...args: unknown[]) => unknown;
		populateVectorStore: (...args: unknown[]) => unknown;
	}) =>
		class BaseNode {
			getVectorStoreClient = config.getVectorStoreClient;
			populateVectorStore = config.populateVectorStore;
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
) {
	const context = mock<ISupplyDataFunctions>();
	context.getNode.mockReturnValue(mock<INode>({ name: 'Weaviate' }));
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
			await getClient({ maxVectorDistance: 0 });

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
				filter: undefined,
				queryProperties: ['title', 'body'],
				maxVectorDistance: 0.4,
				fusionType: 'Ranked',
				returnMetadata: ['explainScore'],
			});
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
});
