/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
/* eslint-disable n8n-nodes-base/node-param-display-name-miscased-id */
import type { Embeddings } from '@langchain/core/embeddings';
import { proxyFetch } from '@n8n/ai-utilities';
import { DATABRICKS_PARTNER_USER_AGENT } from 'n8n-nodes-base/dist/nodes/Databricks/constants';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	INodeProperties,
	INodeType,
	ISupplyDataFunctions,
} from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { getDatabricksTokenProvider } from '@utils/databricks/token-provider';
import { DatabricksVectorStore } from './DatabricksVectorStore';
import { VectorStoreDatabricks } from './VectorStoreDatabricks.node';

vi.mock('./DatabricksVectorStore', () => ({
	DatabricksVectorStore: { fromExistingIndex: vi.fn(), describeIndex: vi.fn() },
}));
vi.mock('@utils/databricks/token-provider');
vi.mock('@n8n/ai-utilities', async (importActual) => ({
	...(await importActual()),
	proxyFetch: vi.fn(),
}));

const mockedFromExistingIndex = vi.mocked(DatabricksVectorStore.fromExistingIndex);
const mockedDescribeIndex = vi.mocked(DatabricksVectorStore.describeIndex);

const mockCredential = {
	host: 'https://ws.example.com/',
	grantType: 'clientCredentials',
	clientId: 'test-client-id',
	clientSecret: 'test-client-secret',
	allowedHttpRequestDomains: 'all',
	allowedDomains: '',
};

const nodeDef: INode = {
	id: '1',
	name: 'Databricks Vector Store',
	typeVersion: 1.3,
	type: '@n8n/n8n-nodes-langchain.vectorStoreDatabricks',
	position: [0, 0],
	parameters: {},
};

const baseParams = {
	databricksIndex: { mode: 'list', value: 'cat.sch.idx' },
	contentColumn: 'text',
	options: {},
};

const indexInfo = {
	name: 'cat.sch.idx',
	primaryKey: 'id',
	indexType: 'DELTA_SYNC' as const,
	embedding: { kind: 'managed' as const, sourceColumn: 'text' },
	schemaColumns: ['id', 'text', 'source'],
};

describe('VectorStoreDatabricks', () => {
	let node: VectorStoreDatabricks;
	const methods = new VectorStoreDatabricks().methods as Required<
		NonNullable<INodeType['methods']>
	>;
	let embeddings: ReturnType<typeof mock<Embeddings>>;

	const setupContext = <T extends IExecuteFunctions | ISupplyDataFunctions>(
		params: IDataObject,
		credentialOverrides: Partial<typeof mockCredential> = {},
	) => {
		const ctx = createMockExecuteFunction<T>(params, nodeDef) as Mocked<T>;
		ctx.getCredentials = vi.fn().mockResolvedValue({ ...mockCredential, ...credentialOverrides });
		ctx.getInputData = vi.fn().mockReturnValue([{ json: {} }]);
		ctx.getInputConnectionData = vi.fn().mockResolvedValue(embeddings);
		ctx.logAiEvent = vi.fn();
		return ctx;
	};

	beforeEach(() => {
		vi.resetAllMocks();
		node = new VectorStoreDatabricks();
		embeddings = mock<Embeddings>();
		mockedDescribeIndex.mockResolvedValue(indexInfo);
		vi.mocked(getDatabricksTokenProvider).mockReturnValue({
			getToken: vi.fn(async () => 'test-token'),
			expiredStatus: 403,
		});
	});

	describe('description', () => {
		it('is a hidden vector store node with the four default modes', () => {
			expect(node.description).toMatchObject({
				name: 'vectorStoreDatabricks',
				hidden: true,
				credentials: [{ name: 'databricksOAuth2Api', required: true }],
			});
			const mode = node.description.properties.find((p) => p.name === 'mode');
			expect(mode?.options?.map((option) => 'value' in option && option.value)).toEqual([
				'load',
				'insert',
				'retrieve',
				'retrieve-as-tool',
			]);
		});

		it('declares the shared fields', () => {
			const { properties } = node.description;
			const index = properties.find((p) => p.name === 'databricksIndex');
			expect(index?.type).toBe('resourceLocator');
			expect(index?.modes?.[0].typeOptions?.searchListMethod).toBe('searchIndexes');

			const contentColumn = properties.find((p) => p.name === 'contentColumn');
			expect(contentColumn?.typeOptions).toEqual({
				loadOptionsMethod: 'getIndexColumns',
				loadOptionsDependsOn: ['databricksIndex.value'],
			});

			const options = properties.find((p) => p.name === 'options');
			const metadataColumns = (options?.options as INodeProperties[]).find(
				(o) => o.name === 'metadataColumns',
			);
			expect(metadataColumns?.type).toBe('multiOptions');
			expect(metadataColumns?.typeOptions?.loadOptionsMethod).toBe('getIndexColumns');
			expect(options?.displayOptions?.show?.mode).toEqual(['load', 'retrieve', 'retrieve-as-tool']);

			const searchMode = (options?.options as INodeProperties[]).find(
				(o) => o.name === 'searchMode',
			);
			expect(searchMode?.type).toBe('options');
			expect(searchMode?.default).toBe('ANN');
			expect(searchMode?.options?.map((o) => 'value' in o && o.value)).toEqual(['ANN', 'HYBRID']);

			const searchFilterJson = (options?.options as INodeProperties[]).find(
				(o) => o.name === 'searchFilterJson',
			);
			expect(searchFilterJson?.type).toBe('json');
		});
	});

	describe('supplyData in retrieve mode', () => {
		it('creates the store from the credential host, the shared fields and the search options', async () => {
			const store = {};
			mockedFromExistingIndex.mockResolvedValue(store as DatabricksVectorStore);
			mockedDescribeIndex.mockResolvedValue(indexInfo);
			const ctx = setupContext<ISupplyDataFunctions>({
				...baseParams,
				mode: 'retrieve',
				options: {
					metadataColumns: ['source'],
					searchMode: 'HYBRID',
					searchFilterJson: { source: 'hr' },
				},
			});

			const result = await node.supplyData.call(ctx, 0);

			expect(mockedFromExistingIndex).toHaveBeenCalledWith(embeddings, {
				fetch: expect.any(Function),
				host: 'https://ws.example.com',
				indexName: 'cat.sch.idx',
				contentColumn: 'text',
				metadataColumns: ['source'],
				queryType: 'HYBRID',
				filter: { source: 'hr' },
				index: indexInfo,
			});
			expect(mockedDescribeIndex).toHaveBeenCalledWith(
				expect.any(Function),
				'https://ws.example.com',
				'cat.sch.idx',
			);
			expect(result.response).toBeDefined();
		});

		it('describes the index again after a failed describe in the same run', async () => {
			mockedFromExistingIndex.mockResolvedValue({} as DatabricksVectorStore);
			mockedDescribeIndex
				.mockRejectedValueOnce(new Error('503 Service Unavailable'))
				.mockResolvedValueOnce(indexInfo);
			const ctx = setupContext<ISupplyDataFunctions>({ ...baseParams, mode: 'retrieve' });

			await expect(node.supplyData.call(ctx, 0)).rejects.toThrow('503');
			await node.supplyData.call(ctx, 0);

			expect(mockedDescribeIndex).toHaveBeenCalledTimes(2);
			expect(mockedFromExistingIndex).toHaveBeenCalledTimes(1);
			expect(mockedFromExistingIndex).toHaveBeenCalledWith(
				embeddings,
				expect.objectContaining({ index: indexInfo }),
			);
		});

		it('opens the run again after a failed credential lookup in the same run', async () => {
			mockedFromExistingIndex.mockResolvedValue({} as DatabricksVectorStore);
			mockedDescribeIndex.mockResolvedValue(indexInfo);
			const ctx = setupContext<ISupplyDataFunctions>({ ...baseParams, mode: 'retrieve' });
			ctx.getCredentials = vi
				.fn()
				.mockRejectedValueOnce(new Error('credential store unavailable'))
				.mockResolvedValue(mockCredential);

			await expect(node.supplyData.call(ctx, 0)).rejects.toThrow('credential store unavailable');
			await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledTimes(2);
			expect(mockedFromExistingIndex).toHaveBeenCalledTimes(1);
		});

		it('rejects an http host before describing the index', async () => {
			const ctx = setupContext<ISupplyDataFunctions>(
				{ ...baseParams, mode: 'retrieve' },
				{ host: 'http://ws.example.com' },
			);

			await expect(node.supplyData.call(ctx, 0)).rejects.toThrow('must use https');
			expect(mockedFromExistingIndex).not.toHaveBeenCalled();
		});

		it('sends the bearer, the partner User-Agent and a cancellable signal through the shared pool', async () => {
			mockedFromExistingIndex.mockResolvedValue({} as DatabricksVectorStore);
			vi.mocked(proxyFetch).mockResolvedValue(new Response('{}'));
			const cancel = new AbortController();
			const ctx = setupContext<ISupplyDataFunctions>({ ...baseParams, mode: 'retrieve' });
			ctx.getExecutionCancelSignal = vi.fn().mockReturnValue(cancel.signal);
			await node.supplyData.call(ctx, 0);

			const { fetch } = mockedFromExistingIndex.mock.calls[0][1];
			await fetch('https://ws.example.com/x');

			const [{ input, init, timeoutOptions }] = vi.mocked(proxyFetch).mock.calls[0];
			expect(String(input)).toBe('https://ws.example.com/x');
			const headers = new Headers(init?.headers);
			expect(headers.get('authorization')).toBe('Bearer test-token');
			expect(headers.get('user-agent')).toBe(DATABRICKS_PARTNER_USER_AGENT);
			// No timeoutOptions: they would force a fresh undici Agent for every request
			expect(timeoutOptions).toBeUndefined();
			expect(init?.signal).toBeInstanceOf(AbortSignal);
			expect(init?.signal?.aborted).toBe(false);
			cancel.abort();
			expect(init?.signal?.aborted).toBe(true);
		});

		it('aborts on a signal the caller already set', async () => {
			mockedFromExistingIndex.mockResolvedValue({} as DatabricksVectorStore);
			vi.mocked(proxyFetch).mockResolvedValue(new Response('{}'));
			const ctx = setupContext<ISupplyDataFunctions>({ ...baseParams, mode: 'retrieve' });
			ctx.getExecutionCancelSignal = vi.fn().mockReturnValue(new AbortController().signal);
			await node.supplyData.call(ctx, 0);

			const { fetch } = mockedFromExistingIndex.mock.calls[0][1];
			const caller = new AbortController();
			await fetch('https://ws.example.com/x', { signal: caller.signal });

			const signal = vi.mocked(proxyFetch).mock.calls[0][0].init?.signal;
			expect(signal?.aborted).toBe(false);
			caller.abort();
			expect(signal?.aborted).toBe(true);
		});
	});

	describe('execute in load mode', () => {
		it('searches by text and never embeds the prompt', async () => {
			const doc = { pageContent: 'hello', metadata: { source: 'hr' } };
			const store = { similaritySearchWithScore: vi.fn().mockResolvedValue([[doc, 0.9]]) };
			mockedFromExistingIndex.mockResolvedValue(store as unknown as DatabricksVectorStore);
			const ctx = setupContext<IExecuteFunctions>({
				...baseParams,
				mode: 'load',
				prompt: 'what is up',
				topK: 2,
			});

			const result = await node.execute.call(ctx);

			expect(store.similaritySearchWithScore).toHaveBeenCalledWith('what is up', 2, undefined);
			expect(embeddings.embedQuery).not.toHaveBeenCalled();
			expect(result).toEqual([[{ json: { document: doc, score: 0.9 }, pairedItem: { item: 0 } }]]);
		});

		it('mints the token and describes the index once for every item of the run', async () => {
			const store = { similaritySearchWithScore: vi.fn().mockResolvedValue([]) };
			mockedFromExistingIndex.mockResolvedValue(store as unknown as DatabricksVectorStore);
			mockedDescribeIndex.mockResolvedValue(indexInfo);
			const ctx = setupContext<IExecuteFunctions>({
				...baseParams,
				mode: 'load',
				prompt: 'what is up',
				topK: 2,
			});
			ctx.getInputData = vi.fn().mockReturnValue([{ json: {} }, { json: {} }]);

			await node.execute.call(ctx);

			expect(store.similaritySearchWithScore).toHaveBeenCalledTimes(2);
			expect(mockedFromExistingIndex).toHaveBeenCalledTimes(2);
			expect(mockedDescribeIndex).toHaveBeenCalledTimes(1);
			expect(getDatabricksTokenProvider).toHaveBeenCalledTimes(1);
			expect(ctx.getCredentials).toHaveBeenCalledTimes(1);
		});

		it('reaches the class with the configured search mode, metadata filter and limit', async () => {
			const store = { similaritySearchWithScore: vi.fn().mockResolvedValue([]) };
			mockedFromExistingIndex.mockResolvedValue(store as unknown as DatabricksVectorStore);
			const ctx = setupContext<IExecuteFunctions>({
				...baseParams,
				mode: 'load',
				prompt: 'what is up',
				topK: 3,
				options: { searchMode: 'HYBRID', searchFilterJson: { source: 'hr' } },
			});

			await node.execute.call(ctx);

			expect(mockedFromExistingIndex).toHaveBeenCalledWith(
				embeddings,
				expect.objectContaining({ queryType: 'HYBRID' }),
			);
			expect(store.similaritySearchWithScore).toHaveBeenCalledWith('what is up', 3, {
				source: 'hr',
			});
		});
	});

	describe('execute in insert mode', () => {
		it('adds the loaded documents through the store', async () => {
			const documents = [
				{ pageContent: 'hello', metadata: { source: 'hr' } },
				{ pageContent: 'world', metadata: {} },
			];
			const store = {
				addDocuments: vi.fn(async (docs: unknown[]) => docs.map((_, i) => String(i))),
			};
			mockedFromExistingIndex.mockResolvedValue(store as unknown as DatabricksVectorStore);
			const ctx = setupContext<IExecuteFunctions>({ ...baseParams, mode: 'insert' });
			ctx.getInputConnectionData = vi
				.fn()
				.mockResolvedValueOnce(embeddings)
				.mockResolvedValueOnce(documents);
			ctx.getExecutionCancelSignal = vi.fn().mockReturnValue(undefined);

			const result = await node.execute.call(ctx);

			expect(mockedFromExistingIndex).toHaveBeenCalledWith(
				embeddings,
				expect.objectContaining({ indexName: 'cat.sch.idx', filter: undefined }),
			);
			expect(store.addDocuments).toHaveBeenCalledWith(documents);
			expect(result).toEqual([documents.map((doc) => ({ json: doc, pairedItem: { item: 0 } }))]);
		});
	});

	describe('searchIndexes', () => {
		const pages: Record<string, unknown> = {
			endpoints: { endpoints: [{ name: 'ep1' }, { name: 'ep2' }] },
			'ep1:': { vector_indexes: [{ name: 'cat.sch.zeta', index_type: 'DIRECT_ACCESS' }] },
			'ep2:': {
				vector_indexes: [{ name: 'cat.sch.beta', index_type: 'DELTA_SYNC' }],
				next_page_token: 'p2',
			},
			'ep2:p2': { vector_indexes: [{ name: 'cat.sch.alpha', index_type: 'DELTA_SYNC' }] },
		};

		let httpRequestWithAuthentication: ReturnType<typeof vi.fn>;
		let ctx: ILoadOptionsFunctions;

		const setupSearchContext = (host: string) => {
			httpRequestWithAuthentication = vi.fn(
				async (_type: string, options: { url: string; qs: Record<string, string> }) =>
					options.url.endsWith('/endpoints')
						? pages.endpoints
						: pages[`${options.qs.endpoint_name}:${options.qs.page_token ?? ''}`],
			);
			ctx = {
				getCredentials: vi.fn().mockResolvedValue({ ...mockCredential, host }),
				getNode: vi.fn().mockReturnValue(nodeDef),
				helpers: { httpRequestWithAuthentication },
			} as unknown as ILoadOptionsFunctions;
		};

		it('lists every index of every endpoint, sorted, with the type and endpoint', async () => {
			setupSearchContext('https://ws.example.com/');

			const result = await methods.listSearch.searchIndexes.call(ctx);

			expect(result.results).toEqual([
				{ name: 'cat.sch.alpha', value: 'cat.sch.alpha', description: 'DELTA_SYNC - ep2' },
				{ name: 'cat.sch.beta', value: 'cat.sch.beta', description: 'DELTA_SYNC - ep2' },
				{ name: 'cat.sch.zeta', value: 'cat.sch.zeta', description: 'DIRECT_ACCESS - ep1' },
			]);
			expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(4);
			for (const [type, options] of httpRequestWithAuthentication.mock.calls) {
				expect(type).toBe('databricksOAuth2Api');
				expect(options.url).toMatch(/^https:\/\/ws\.example\.com\/api\/2\.0\/vector-search\//);
				expect(options.headers).toMatchObject({ 'User-Agent': DATABRICKS_PARTNER_USER_AGENT });
			}
		});

		it('does not let the bearer follow a cross-origin redirect', async () => {
			setupSearchContext('https://ws.example.com');

			await methods.listSearch.searchIndexes.call(ctx);

			for (const [, options] of httpRequestWithAuthentication.mock.calls) {
				expect(options.sendCredentialsOnCrossOriginRedirect).toBe(false);
			}
		});

		it('applies the substring filter to the name', async () => {
			setupSearchContext('https://ws.example.com');

			const result = await methods.listSearch.searchIndexes.call(ctx, 'ZETA');

			expect(result.results.map((r) => r.value)).toEqual(['cat.sch.zeta']);
		});

		it('stops after 50 pages when a page echoes its own token', async () => {
			setupSearchContext('https://ws.example.com');
			httpRequestWithAuthentication.mockResolvedValue({ endpoints: [], next_page_token: 'loop' });

			await expect(methods.listSearch.searchIndexes.call(ctx)).rejects.toThrow('50 pages');
			expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(50);
		});

		it('rejects an http host before any request', async () => {
			setupSearchContext('http://ws.example.com');

			await expect(methods.listSearch.searchIndexes.call(ctx)).rejects.toThrow('must use https');
			expect(httpRequestWithAuthentication).not.toHaveBeenCalled();
		});
	});

	describe('getIndexColumns', () => {
		const setupLoadOptionsContext = (indexName: string) => {
			const ctx = createMockExecuteFunction<ILoadOptionsFunctions>(
				{},
				nodeDef,
			) as Mocked<ILoadOptionsFunctions>;
			ctx.getCredentials = vi.fn().mockResolvedValue(mockCredential);
			ctx.getCurrentNodeParameter = vi.fn().mockReturnValue(indexName);
			return ctx;
		};

		it('lists the embedding source column first and hides the primary key', async () => {
			mockedDescribeIndex.mockResolvedValue({
				name: 'cat.sch.idx',
				primaryKey: 'id',
				indexType: 'DELTA_SYNC',
				embedding: { kind: 'managed', sourceColumn: 'text' },
				schemaColumns: ['id', 'text', 'source'],
			});
			const ctx = setupLoadOptionsContext('cat.sch.idx');

			const result = await methods.loadOptions.getIndexColumns.call(ctx);

			expect(mockedDescribeIndex).toHaveBeenCalledWith(
				expect.any(Function),
				'https://ws.example.com',
				'cat.sch.idx',
			);
			expect(ctx.getCurrentNodeParameter).toHaveBeenCalledWith('databricksIndex', {
				extractValue: true,
			});
			expect(result).toEqual([
				{ name: 'text', value: 'text', description: 'Embedding source column' },
				{ name: 'source', value: 'source' },
			]);
		});

		it('hides the vector column of a Direct Access index', async () => {
			mockedDescribeIndex.mockResolvedValue({
				name: 'cat.sch.idx',
				primaryKey: 'id',
				indexType: 'DIRECT_ACCESS',
				embedding: { kind: 'self', vectorColumn: 'embedding' },
				schemaColumns: ['id', 'text', 'embedding'],
			});
			const ctx = setupLoadOptionsContext('cat.sch.idx');

			await expect(methods.loadOptions.getIndexColumns.call(ctx)).resolves.toEqual([
				{ name: 'text', value: 'text' },
			]);
		});

		it('returns no columns when the index schema is unknown', async () => {
			mockedDescribeIndex.mockResolvedValue({
				name: 'cat.sch.idx',
				primaryKey: 'id',
				indexType: 'DELTA_SYNC',
				embedding: { kind: 'self', vectorColumn: 'embedding' },
			});
			const ctx = setupLoadOptionsContext('cat.sch.idx');

			await expect(methods.loadOptions.getIndexColumns.call(ctx)).resolves.toEqual([]);
		});

		it('returns no columns before an index is chosen', async () => {
			const ctx = setupLoadOptionsContext('');

			await expect(methods.loadOptions.getIndexColumns.call(ctx)).resolves.toEqual([]);
			expect(mockedDescribeIndex).not.toHaveBeenCalled();
		});
	});
});
