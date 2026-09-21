import type { Embeddings } from '@langchain/core/embeddings';
import { OperationalError, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { DatabricksVectorStoreConfig } from './DatabricksVectorStore';
import { DatabricksVectorStore, parseIndexInfo } from './DatabricksVectorStore';

// The real query API returns `manifest` at the top level. The nodes-base test
// fixture nests it inside `result`; do not align these fixtures with it.
const host = 'https://ws.example.com';

const managedDescribe = {
	name: 'cat.sch.idx',
	primary_key: 'id',
	index_type: 'DELTA_SYNC',
	delta_sync_index_spec: {
		source_table: 'cat.sch.docs',
		embedding_source_columns: [{ name: 'text', embedding_model_endpoint_name: 'e5' }],
	},
};
const ucTable = { columns: [{ name: 'id' }, { name: 'text' }, { name: 'source' }] };

const directDescribe = {
	name: 'cat.sch.idx',
	primary_key: 'id',
	index_type: 'DIRECT_ACCESS',
	direct_access_index_spec: {
		embedding_vector_columns: [{ name: 'embedding', embedding_dimension: 3 }],
		schema_json: '{"id":"string","text":"string","source":"string","embedding":"array<float>"}',
	},
};

const queryReply = {
	manifest: {
		column_count: 4,
		columns: [{ name: 'source' }, { name: 'id' }, { name: 'text' }, { name: 'score' }],
	},
	result: {
		row_count: 2,
		data_array: [
			['hr', 'a', 'hello', 0.9],
			['it', 'b', 'world', 0.8],
		],
	},
};
const emptyReply = { manifest: queryReply.manifest, result: { row_count: 0 } };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('DatabricksVectorStore', () => {
	let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
	let embeddings: ReturnType<typeof mock<Embeddings>>;

	const bodyOf = (call: number) => JSON.parse(String(fetchMock.mock.calls[call][1]?.body));
	const urlOf = (call: number) => String(fetchMock.mock.calls[call][0]);

	const createStore = async (
		describe: unknown,
		overrides: Partial<DatabricksVectorStoreConfig> = {},
		ucReply?: Response,
	) => {
		fetchMock.mockResolvedValueOnce(json(describe));
		if (ucReply) fetchMock.mockResolvedValueOnce(ucReply);
		const store = await DatabricksVectorStore.fromExistingIndex(embeddings, {
			fetch: fetchMock,
			host,
			indexName: 'cat.sch.idx',
			...overrides,
		});
		fetchMock.mockClear();
		return store;
	};
	const managedStore = async (overrides: Partial<DatabricksVectorStoreConfig> = {}) =>
		await createStore(managedDescribe, overrides, json(ucTable));
	const directStore = async (overrides: Partial<DatabricksVectorStoreConfig> = {}) =>
		await createStore(directDescribe, { contentColumn: 'text', ...overrides });

	beforeEach(() => {
		fetchMock = vi.fn<typeof fetch>();
		embeddings = mock<Embeddings>();
		embeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);
		embeddings.embedDocuments.mockResolvedValue([
			[1, 2, 3],
			[4, 5, 6],
		]);
	});

	describe('parseIndexInfo', () => {
		it('reads a managed Delta Sync index', () => {
			expect(parseIndexInfo(managedDescribe)).toEqual({
				name: 'cat.sch.idx',
				primaryKey: 'id',
				indexType: 'DELTA_SYNC',
				embeddingSourceColumn: 'text',
				embeddingModelEndpoint: 'e5',
				vectorColumn: undefined,
				schemaColumns: undefined,
				sourceTable: 'cat.sch.docs',
			});
		});

		it('reads a self-managed Direct Access index with its schema columns', () => {
			expect(parseIndexInfo(directDescribe)).toMatchObject({
				indexType: 'DIRECT_ACCESS',
				embeddingSourceColumn: undefined,
				vectorColumn: 'embedding',
				schemaColumns: ['id', 'text', 'source', 'embedding'],
				sourceTable: undefined,
			});
		});

		it('takes the Delta Sync columns from columns_to_sync when present', () => {
			const raw = {
				...managedDescribe,
				delta_sync_index_spec: {
					...managedDescribe.delta_sync_index_spec,
					columns_to_sync: ['id', 'text'],
				},
			};
			expect(parseIndexInfo(raw).schemaColumns).toEqual(['id', 'text']);
		});

		it.each([
			['missing primary key', { ...managedDescribe, primary_key: undefined }],
			['unknown index type', { ...managedDescribe, index_type: 'OTHER' }],
			[
				'malformed schema_json',
				{
					...directDescribe,
					direct_access_index_spec: {
						...directDescribe.direct_access_index_spec,
						schema_json: '{',
					},
				},
			],
		])('throws on %s', (_label, raw) => {
			expect(() => parseIndexInfo(raw)).toThrow('Unexpected Databricks index description');
		});
	});

	describe('describeIndex', () => {
		it('skips the Unity Catalog lookup when the spec lists columns_to_sync', async () => {
			fetchMock.mockResolvedValueOnce(
				json({
					...managedDescribe,
					delta_sync_index_spec: {
						...managedDescribe.delta_sync_index_spec,
						columns_to_sync: ['id', 'text'],
					},
				}),
			);

			const info = await DatabricksVectorStore.describeIndex(fetchMock, host, 'cat.sch.idx');

			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(info.schemaColumns).toEqual(['id', 'text']);
		});

		it('reads the Delta Sync columns from Unity Catalog', async () => {
			fetchMock.mockResolvedValueOnce(json(managedDescribe)).mockResolvedValueOnce(json(ucTable));

			const info = await DatabricksVectorStore.describeIndex(fetchMock, host, 'cat.sch.idx');

			expect(urlOf(0)).toBe(`${host}/api/2.0/vector-search/indexes/cat.sch.idx`);
			expect(urlOf(1)).toBe(`${host}/api/2.1/unity-catalog/tables/cat.sch.docs`);
			expect(info.schemaColumns).toEqual(['id', 'text', 'source']);
		});

		it('leaves the columns unknown when Unity Catalog denies the table', async () => {
			fetchMock
				.mockResolvedValueOnce(json(managedDescribe))
				.mockResolvedValueOnce(json({ error_code: 'PERMISSION_DENIED' }, 403));

			const info = await DatabricksVectorStore.describeIndex(fetchMock, host, 'cat.sch.idx');

			expect(info.schemaColumns).toBeUndefined();
		});

		it('propagates a transport error from the Unity Catalog lookup', async () => {
			fetchMock
				.mockResolvedValueOnce(json(managedDescribe))
				.mockRejectedValueOnce(new Error('ECONNRESET'));

			await expect(
				DatabricksVectorStore.describeIndex(fetchMock, host, 'cat.sch.idx'),
			).rejects.toThrow('ECONNRESET');
		});

		it('rejects a malformed source table name before the Unity Catalog request', async () => {
			fetchMock.mockResolvedValueOnce(
				json({
					...managedDescribe,
					delta_sync_index_spec: {
						...managedDescribe.delta_sync_index_spec,
						source_table: 'cat.sch/x.y',
					},
				}),
			);

			const attempt = DatabricksVectorStore.describeIndex(fetchMock, host, 'cat.sch.idx');

			await expect(attempt).rejects.toThrow('catalog.schema.table');
			await expect(attempt).rejects.toThrow(OperationalError);
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});

		it('does not call Unity Catalog for a Direct Access index', async () => {
			fetchMock.mockResolvedValueOnce(json(directDescribe));

			const info = await DatabricksVectorStore.describeIndex(fetchMock, host, 'cat.sch.idx');

			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(info.schemaColumns).toEqual(['id', 'text', 'source', 'embedding']);
		});

		it.each(['..', 'cat.sch/x.y', 'cat.sch'])(
			'rejects the index name %s before any request',
			async (indexName) => {
				const attempt = DatabricksVectorStore.describeIndex(fetchMock, host, indexName);

				await expect(attempt).rejects.toThrow('catalog.schema.index');
				await expect(attempt).rejects.toThrow(UserError);
				expect(fetchMock).not.toHaveBeenCalled();
			},
		);
	});

	describe('fromExistingIndex', () => {
		it('skips the describe GET when the index is passed in', async () => {
			const store = await DatabricksVectorStore.fromExistingIndex(embeddings, {
				fetch: fetchMock,
				host,
				indexName: 'cat.sch.idx',
				index: parseIndexInfo(managedDescribe),
			});
			expect(fetchMock).not.toHaveBeenCalled();

			fetchMock.mockResolvedValueOnce(json(emptyReply));
			await store.similaritySearch('hello', 2);

			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(urlOf(0)).toBe(`${host}/api/2.0/vector-search/indexes/cat.sch.idx/query`);
			expect(bodyOf(0)).toMatchObject({ query_text: 'hello', num_results: 2 });
			expect(embeddings.embedQuery).not.toHaveBeenCalled();
		});
	});

	describe('managed-embedding index', () => {
		it('sends query_text and never embeds on the client', async () => {
			const store = await managedStore();
			fetchMock.mockImplementation(async () => json(queryReply));

			const withScore = await store.similaritySearchWithScore('hello', 2);
			const docs = await store.similaritySearch('hello', 2);

			expect(urlOf(0)).toBe(`${host}/api/2.0/vector-search/indexes/cat.sch.idx/query`);
			expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
			expect(bodyOf(0)).toEqual({
				columns: ['id', 'text', 'source'],
				num_results: 2,
				query_type: 'ANN',
				query_text: 'hello',
			});
			expect(withScore).toHaveLength(2);
			expect(docs.map((doc) => doc.pageContent)).toEqual(['hello', 'world']);
			expect(embeddings.embedQuery).not.toHaveBeenCalled();
		});

		it('rejects a vector query without a request', async () => {
			const store = await managedStore();

			await expect(store.similaritySearchVectorWithScore([0.1, 0.2, 0.3], 2)).rejects.toThrow(
				'text queries only',
			);
			expect(fetchMock).not.toHaveBeenCalled();
		});
	});

	describe('self-managed index', () => {
		it('embeds the text and sends query_vector', async () => {
			const store = await directStore();
			fetchMock.mockImplementation(async () => json(queryReply));

			await store.similaritySearchWithScore('hello', 2);
			await store.similaritySearchVectorWithScore([0.1, 0.2, 0.3], 2);
			await store.similaritySearchWithScore('x');

			expect(embeddings.embedQuery).toHaveBeenCalledWith('hello');
			expect(bodyOf(0)).toMatchObject({ query_vector: [0.1, 0.2, 0.3], query_type: 'ANN' });
			expect(bodyOf(0)).not.toHaveProperty('query_text');
			expect(bodyOf(1)).toMatchObject({ query_vector: [0.1, 0.2, 0.3], query_type: 'ANN' });
			expect(bodyOf(2).num_results).toBe(4);
		});

		it('sends the text next to the vector for a HYBRID search', async () => {
			const store = await directStore({ queryType: 'HYBRID' });
			fetchMock.mockImplementation(async () => json(queryReply));

			await store.similaritySearchWithScore('hello', 2);
			await store.similaritySearchVectorWithScore([0.1, 0.2, 0.3], 2);

			expect(bodyOf(0)).toMatchObject({
				query_type: 'HYBRID',
				query_text: 'hello',
				query_vector: [0.1, 0.2, 0.3],
			});
			// The vector path has no text, so it stays ANN
			expect(bodyOf(1)).toMatchObject({ query_type: 'ANN', query_vector: [0.1, 0.2, 0.3] });
			expect(bodyOf(1)).not.toHaveProperty('query_text');
		});

		it('keeps the key, content and vector columns out of the default metadata', async () => {
			const store = await directStore();
			fetchMock.mockResolvedValue(json(queryReply));

			const [[doc]] = await store.similaritySearchWithScore('hello', 2);

			expect(bodyOf(0).columns).toEqual(['id', 'text', 'source']);
			expect(doc).toMatchObject({ id: 'a', pageContent: 'hello' });
			expect(doc.metadata).toEqual({ source: 'hr' });
		});

		it('rejects an empty content column', async () => {
			fetchMock.mockResolvedValueOnce(json(directDescribe));

			await expect(
				DatabricksVectorStore.fromExistingIndex(embeddings, {
					fetch: fetchMock,
					host,
					indexName: 'cat.sch.idx',
				}),
			).rejects.toThrow('content column');
		});
	});

	describe('filters', () => {
		it.each([
			{
				label: 'the call filter',
				config: undefined,
				call: { source: 'hr' },
				expected: '{"source":"hr"}',
			},
			{ label: 'no filter', config: undefined, call: undefined, expected: undefined },
			{
				label: 'the config filter',
				config: { source: 'it' },
				call: undefined,
				expected: '{"source":"it"}',
			},
		])('sends $label as filters_json', async ({ config, call, expected }) => {
			const store = await managedStore({ filter: config });
			fetchMock.mockResolvedValue(json(queryReply));

			await store.similaritySearchWithScore('hello', 2, call);

			expect(bodyOf(0).filters_json).toEqual(expected);
		});
	});

	describe('result parsing', () => {
		it('reads the rows by manifest column name', async () => {
			const store = await managedStore({ metadataColumns: ['source'] });
			fetchMock.mockResolvedValue(json(queryReply));

			const results = await store.similaritySearchWithScore('hello', 2);

			expect(results).toHaveLength(2);
			expect(results[0][0]).toMatchObject({ pageContent: 'hello', id: 'a' });
			expect(results[0][0].metadata).toEqual({ source: 'hr' });
			expect(results[0][1]).toBe(0.9);
			expect(results[1][0]).toMatchObject({
				pageContent: 'world',
				metadata: { source: 'it' },
				id: 'b',
			});
			expect(results[1][1]).toBe(0.8);
		});

		it('returns no documents when row_count is 0', async () => {
			const store = await managedStore();
			fetchMock.mockResolvedValue(json(emptyReply));

			await expect(store.similaritySearchWithScore('hello', 2)).resolves.toEqual([]);
		});

		it.each([
			['the score', [{ name: 'source' }, { name: 'id' }, { name: 'text' }], ['hr', 'a', 'hello']],
			[
				'a requested column',
				[{ name: 'id' }, { name: 'text' }, { name: 'score' }],
				['a', 'hello', 0.9],
			],
		])('rejects a manifest that lacks %s', async (_label, columns, row) => {
			const store = await managedStore({ metadataColumns: ['source'] });
			fetchMock.mockResolvedValue(
				json({ manifest: { columns }, result: { row_count: 1, data_array: [row] } }),
			);

			await expect(store.similaritySearchWithScore('hello', 2)).rejects.toThrow(
				'Unexpected Databricks query response',
			);
		});

		it('reads the trailing score when a metadata column is also named score', async () => {
			const store = await managedStore({ metadataColumns: ['score'] });
			fetchMock.mockResolvedValue(
				json({
					manifest: {
						columns: [{ name: 'id' }, { name: 'text' }, { name: 'score' }, { name: 'score' }],
					},
					result: { row_count: 1, data_array: [['a', 'hello', 'user-score', 0.7]] },
				}),
			);

			const [[doc, score]] = await store.similaritySearchWithScore('hello', 2);

			expect(doc.metadata).toEqual({ score: 'user-score' });
			expect(score).toBe(0.7);
		});
	});

	describe('upsert', () => {
		const upsertOk = { status: 'SUCCESS', result: { success_row_count: 2 } };

		it('upserts rows with only the schema metadata and generated ids', async () => {
			const store = await directStore();
			fetchMock.mockResolvedValue(json(upsertOk));

			const ids = await store.addDocuments([
				{ pageContent: 'hello', metadata: { source: 'hr', loc: { line: 1 } }, id: 'a' },
				{ pageContent: 'world', metadata: {} },
			]);

			expect(urlOf(0)).toBe(`${host}/api/2.0/vector-search/indexes/cat.sch.idx/upsert-data`);
			const rows = JSON.parse(bodyOf(0).inputs_json);
			expect(rows).toHaveLength(2);
			expect(rows[0]).toEqual({ id: 'a', text: 'hello', embedding: [1, 2, 3], source: 'hr' });
			expect(rows[1]).toEqual({
				id: expect.stringMatching(/^[0-9a-f-]{36}$/),
				text: 'world',
				embedding: [4, 5, 6],
			});
			expect(ids).toEqual(['a', rows[1].id]);
		});

		it('does nothing for an empty batch', async () => {
			const store = await directStore();

			await expect(store.addDocuments([])).resolves.toEqual([]);
			expect(fetchMock).not.toHaveBeenCalled();
			expect(embeddings.embedDocuments).not.toHaveBeenCalled();
		});

		it('lists the failed keys when Databricks rejects rows', async () => {
			const store = await directStore();
			fetchMock.mockResolvedValue(
				json({
					status: 'FAILURE',
					result: { success_row_count: 0, failed_primary_keys: ['row-7'] },
				}),
			);

			await expect(
				store.addDocuments([{ pageContent: 'hello', metadata: {}, id: 'row-7' }]),
			).rejects.toThrow('Failed primary keys: row-7');
		});

		it('rejects a managed Delta Sync index without a request', async () => {
			const store = await managedStore();

			await expect(store.addDocuments([{ pageContent: 'hello', metadata: {} }])).rejects.toThrow(
				'Direct Access',
			);
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('rejects a self-managed Delta Sync index without a request', async () => {
			const store = await createStore(
				{
					...managedDescribe,
					delta_sync_index_spec: {
						source_table: 'cat.sch.docs',
						embedding_vector_columns: [{ name: 'embedding' }],
						columns_to_sync: ['id', 'text', 'embedding'],
					},
				},
				{ contentColumn: 'text' },
			);

			await expect(store.addDocuments([{ pageContent: 'hello', metadata: {} }])).rejects.toThrow(
				'Direct Access',
			);
			expect(fetchMock).not.toHaveBeenCalled();
		});
	});

	describe('errors', () => {
		it('reports the status and the sanitized body, never the request', async () => {
			// Wrap the stub the way the node's auth fetch does, so a leak would be visible
			const authFetch: typeof fetch = async (input, init) =>
				await fetchMock(input, {
					...init,
					headers: { ...init?.headers, authorization: 'Bearer super-secret' },
				});
			const store = await managedStore({ fetch: authFetch });
			fetchMock.mockResolvedValue(
				json({ error_code: 'PERMISSION_DENIED', message: 'nope\u0001!' }, 403),
			);

			const error: unknown = await store.similaritySearchWithScore('hello', 2).catch((e) => e);

			expect(error).toBeInstanceOf(Error);
			const message = (error as Error).message;
			expect(message).toContain('403');
			expect(message).toContain('nope');
			expect(message).not.toContain('\u0001');
			const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error));
			expect(serialized).not.toContain('super-secret');
			expect(serialized).not.toContain('hello');
		});

		it('caps a raw text body at 500 characters', async () => {
			const store = await managedStore();
			fetchMock.mockResolvedValue(new Response('x'.repeat(2000), { status: 500 }));

			const error: unknown = await store.similaritySearchWithScore('hello', 2).catch((e) => e);

			expect((error as Error).message).toContain('500');
			expect((error as Error).message.length).toBeLessThan(600);
		});
	});
});
