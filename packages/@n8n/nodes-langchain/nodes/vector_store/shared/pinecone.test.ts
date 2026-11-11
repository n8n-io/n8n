import type { Embeddings } from '@langchain/core/embeddings';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import type { IHttpRequestOptions, ISupplyDataFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	PineconeDocumentStore,
	assertPineconeIndexAcceptsVectors,
	classifyIndexShape,
	getDocumentIndexScoring,
	getPineconeVectorStore,
	parseIndexModel,
	type PineconeConnection,
} from './pinecone';

vi.mock('@langchain/pinecone', () => ({ PineconeStore: { fromExistingIndex: vi.fn() } }));
vi.mock('@pinecone-database/pinecone', () => ({ Pinecone: vi.fn() }));

// Raw 2026-07 describe responses, snake_case as on the wire
const describeResponse = (fields: Record<string, object>, name = 'idx', ready = true) => ({
	name,
	host: `${name}-abc.svc.pinecone.io`,
	status: { ready, state: ready ? 'Ready' : 'Initializing' },
	schema: { fields },
});

const classic = { _values: { type: 'dense_vector', dimension: 3, metric: 'cosine' } };
const denseDocument = {
	embedding: { type: 'dense_vector', dimension: 3, metric: 'cosine' },
	text: { type: 'string', full_text_search: {} },
};
const embedDocument = {
	text: { type: 'string', embed: { model: 'multilingual-e5-large', dimension: 1024 } },
};

const model = (fields: Record<string, object>, ready = true) =>
	parseIndexModel(describeResponse(fields, 'idx', ready));

describe('classifyIndexShape', () => {
	it('matches the SDK 9 classification', () => {
		expect(classifyIndexShape(model(classic))).toBe('vectors-api');
		expect(
			classifyIndexShape(model({ ...classic, _sparse_values: { type: 'sparse_vector' } })),
		).toBe('vectors-api');
		expect(classifyIndexShape(model(denseDocument))).toBe('documents-api');
		expect(classifyIndexShape(model(embedDocument))).toBe('documents-api');
		expect(classifyIndexShape(model({ ...classic, ...denseDocument }))).toBe('indeterminate');
		expect(classifyIndexShape(model({}, false))).toBe('indeterminate');
	});
});

describe('getDocumentIndexScoring', () => {
	it('returns undefined for indexes on the vectors API', () => {
		expect(getDocumentIndexScoring(model(classic))).toBeUndefined();
		expect(
			getDocumentIndexScoring(model({ ...classic, genre: { filterable: true } })),
		).toBeUndefined();
	});

	it('returns undefined for legacy integrated indexes and indeterminate indexes', () => {
		expect(
			getDocumentIndexScoring(
				model({ _values: { type: 'semantic_text', model: 'llama-text-embed-v2' } }),
			),
		).toBeUndefined();
		expect(getDocumentIndexScoring(model({}, false))).toBeUndefined();
	});

	it('scores a document index by its dense vector field', () => {
		expect(getDocumentIndexScoring(model(denseDocument))).toEqual({
			type: 'dense_vector',
			field: 'embedding',
		});
	});

	it('scores a document index by its integrated embedding field', () => {
		expect(getDocumentIndexScoring(model(embedDocument))).toEqual({ type: 'embed', field: 'text' });
	});

	it('prefers the dense vector field when both exist', () => {
		expect(getDocumentIndexScoring(model({ ...embedDocument, ...denseDocument }))).toEqual({
			type: 'dense_vector',
			field: 'embedding',
		});
	});

	it('throws for a document index without a field to search', () => {
		expect(() =>
			getDocumentIndexScoring(model({ body: { type: 'string', full_text_search: {} } })),
		).toThrow('has no dense vector field or integrated embedding field');
	});
});

describe('getPineconeVectorStore', () => {
	const embeddings = mock<Embeddings>();
	const request =
		vi.fn<(credentialType: string, options: IHttpRequestOptions) => Promise<unknown>>();
	const v5Index = vi.fn();
	let describe: unknown;
	let searchResponse: unknown;
	let indexCounter = 0;
	// The describe cache is module-wide, so every test uses its own index name
	const nextIndexName = () => `idx-${++indexCounter}`;

	const connection = (): PineconeConnection => {
		const context = mock<ISupplyDataFunctions>({
			helpers: {
				httpRequestWithAuthentication: async (
					credentialType: string,
					options: IHttpRequestOptions,
				) => await request(credentialType, options),
			},
		});
		return { context, credentialType: 'pineconeApi', apiKey: 'key' };
	};
	const searchCall = () => request.mock.calls.find(([, o]) => o.method === 'POST')?.[1];

	beforeEach(() => {
		vi.clearAllMocks();
		request.mockImplementation(async (_type, options) => {
			if (options.method === 'GET') {
				if (describe instanceof Error) throw describe;
				return describe;
			}
			return searchResponse;
		});
		vi.mocked(Pinecone).mockImplementation(function () {
			return { Index: v5Index } as never;
		});
		v5Index.mockReturnValue('v5-index');
		vi.mocked(PineconeStore.fromExistingIndex).mockResolvedValue('legacy-store' as never);
		embeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);
		searchResponse = { matches: [] };
	});

	it('describes the index with the credential and the 2026-07 API version', async () => {
		const indexName = nextIndexName();
		describe = describeResponse(classic, indexName);

		await getPineconeVectorStore(connection(), embeddings, { indexName });

		expect(request).toHaveBeenCalledWith('pineconeApi', {
			method: 'GET',
			url: `https://api.pinecone.io/indexes/${indexName}`,
			headers: { 'X-Pinecone-API-Version': '2026-07' },
			json: true,
		});
	});

	it('keeps classic indexes on LangChain PineconeStore', async () => {
		const indexName = nextIndexName();
		describe = describeResponse(classic, indexName);

		const store = await getPineconeVectorStore(connection(), embeddings, {
			indexName,
			namespace: 'ns',
			filter: { genre: 'drama' },
		});

		expect(store).toBe('legacy-store');
		expect(v5Index).toHaveBeenCalledWith(indexName);
		expect(PineconeStore.fromExistingIndex).toHaveBeenCalledWith(embeddings, {
			namespace: 'ns',
			pineconeIndex: 'v5-index',
			filter: { genre: 'drama' },
		});
	});

	it('keeps the vectors API path when describe fails', async () => {
		describe = new Error('boom');

		const store = await getPineconeVectorStore(connection(), embeddings, {
			indexName: nextIndexName(),
		});

		expect(store).toBe('legacy-store');
	});

	it('describes each index once and reuses the result', async () => {
		const indexName = nextIndexName();
		describe = describeResponse(classic, indexName);

		await getPineconeVectorStore(connection(), embeddings, { indexName });
		await getPineconeVectorStore(connection(), embeddings, { indexName });

		expect(request).toHaveBeenCalledTimes(1);
	});

	it('searches a dense document index through the documents API', async () => {
		const indexName = nextIndexName();
		describe = describeResponse(denseDocument, indexName);
		searchResponse = {
			matches: [
				{ _id: 'doc-1', _score: 0.9, text: 'Hello', embedding: [1, 2, 3], source: 'a.pdf' },
			],
		};

		const store = await getPineconeVectorStore(connection(), embeddings, {
			indexName,
			namespace: 'my ns',
			filter: { source: { $eq: 'a.pdf' } },
		});
		const results = await store.similaritySearchWithScore('hi', 3);

		expect(store).toBeInstanceOf(PineconeDocumentStore);
		expect(embeddings.embedQuery).toHaveBeenCalledWith('hi');
		expect(searchCall()).toEqual({
			method: 'POST',
			url: `https://${indexName}-abc.svc.pinecone.io/namespaces/my%20ns/documents/search`,
			headers: { 'X-Pinecone-API-Version': '2026-07' },
			json: true,
			body: {
				score_by: [{ type: 'dense_vector', field: 'embedding', values: [0.1, 0.2, 0.3] }],
				top_k: 3,
				include_fields: ['*'],
				filter: { source: { $eq: 'a.pdf' } },
			},
		});
		expect(results).toHaveLength(1);
		const [doc, score] = results[0];
		expect(score).toBe(0.9);
		expect(doc.id).toBe('doc-1');
		expect(doc.pageContent).toBe('Hello');
		expect(doc.metadata).toEqual({ source: 'a.pdf' });
	});

	it('uses the default namespace and a search filter over the default filter', async () => {
		const indexName = nextIndexName();
		describe = describeResponse(denseDocument, indexName);

		const store = await getPineconeVectorStore(connection(), embeddings, {
			indexName,
			namespace: '',
			filter: { a: 1 },
		});
		await store.similaritySearchVectorWithScore([1, 1, 1], 2, { b: 2 });

		expect(searchCall()?.url).toBe(
			`https://${indexName}-abc.svc.pinecone.io/namespaces/__default__/documents/search`,
		);
		expect(searchCall()?.body).toEqual(expect.objectContaining({ top_k: 2, filter: { b: 2 } }));
	});

	it('sends the query text when Pinecone embeds the index', async () => {
		const indexName = nextIndexName();
		describe = describeResponse(embedDocument, indexName);
		searchResponse = { matches: [{ _id: 'doc-1', _score: 0.5, text: 'Hello' }] };

		const store = await getPineconeVectorStore(connection(), embeddings, { indexName });
		const docs = await store.similaritySearch('hi', 4);

		expect(embeddings.embedQuery).not.toHaveBeenCalled();
		expect(searchCall()?.body).toEqual({
			score_by: [{ type: 'embed', field: 'text', query: 'hi' }],
			top_k: 4,
			include_fields: ['*'],
		});
		expect(docs[0].pageContent).toBe('Hello');
		await expect(store.similaritySearchVectorWithScore([1], 4)).rejects.toThrow(
			'needs the query text',
		);
	});

	it('maps page content from the text field option, else the first string field', async () => {
		const indexName = nextIndexName();
		describe = describeResponse(denseDocument, indexName);
		searchResponse = {
			matches: [{ _id: 'doc-1', _score: 0.5, year: 2020, body: 'Body', title: 'Title' }],
		};

		const fallback = await getPineconeVectorStore(connection(), embeddings, { indexName });
		const [[fallbackDoc]] = await fallback.similaritySearchVectorWithScore([1, 1, 1], 1);
		expect(fallbackDoc.pageContent).toBe('Body');
		expect(fallbackDoc.metadata).toEqual({ year: 2020, title: 'Title' });

		const configured = await getPineconeVectorStore(connection(), embeddings, {
			indexName,
			textField: 'title',
		});
		const [[configuredDoc]] = await configured.similaritySearchVectorWithScore([1, 1, 1], 1);
		expect(configuredDoc.pageContent).toBe('Title');
		expect(configuredDoc.metadata).toEqual({ year: 2020, body: 'Body' });
	});

	it('rejects inserts into a document index with a clear error', async () => {
		const indexName = nextIndexName();
		describe = describeResponse(embedDocument, indexName);

		await expect(assertPineconeIndexAcceptsVectors(connection(), indexName)).rejects.toThrow(
			'Inserting into a Pinecone index with a document schema is not supported yet',
		);
	});

	it('accepts inserts into classic indexes, and when describe fails', async () => {
		const classicName = nextIndexName();
		describe = describeResponse(classic, classicName);
		await expect(
			assertPineconeIndexAcceptsVectors(connection(), classicName),
		).resolves.toBeUndefined();

		describe = new Error('boom');
		await expect(
			assertPineconeIndexAcceptsVectors(connection(), nextIndexName()),
		).resolves.toBeUndefined();
	});

	it('rejects updates through the document store', async () => {
		const indexName = nextIndexName();
		describe = describeResponse(denseDocument, indexName);

		const store = await getPineconeVectorStore(connection(), embeddings, { indexName });

		await expect(store.addDocuments([])).rejects.toThrow('not supported yet');
	});
});
