import type { Embeddings } from '@langchain/core/embeddings';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { Pinecone as PineconeV9, type IndexModel } from '@pinecone-database/pinecone-v9';
import { mock } from 'vitest-mock-extended';

import { PineconeDocumentStore, getDocumentIndexScoring, getPineconeVectorStore } from './pinecone';

vi.mock('@langchain/pinecone', () => ({ PineconeStore: { fromExistingIndex: vi.fn() } }));
vi.mock('@pinecone-database/pinecone', () => ({ Pinecone: vi.fn() }));
vi.mock('@pinecone-database/pinecone-v9', async (importActual) => ({
	...(await importActual()),
	Pinecone: vi.fn(),
}));

// A plain object: a deep mock would answer every missing field, such as `embed`
const indexModel = (fields: Record<string, object>, name = 'idx') =>
	({
		name,
		host: `${name}.svc.pinecone.io`,
		status: { ready: true, state: 'Ready' },
		schema: { fields },
	}) as unknown as IndexModel;

const classic = { _values: { type: 'dense_vector', dimension: 3, metric: 'cosine' } };
const denseDocument = {
	embedding: { type: 'dense_vector', dimension: 3, metric: 'cosine' },
	text: { type: 'string', fullTextSearch: {} },
};
const embedDocument = {
	text: { type: 'string', embed: { model: 'multilingual-e5-large', dimension: 1024 } },
};

describe('getDocumentIndexScoring', () => {
	it('returns undefined for indexes on the vectors API', () => {
		expect(getDocumentIndexScoring(indexModel(classic))).toBeUndefined();
		expect(
			getDocumentIndexScoring(
				indexModel({ ...classic, _sparse_values: { type: 'sparse_vector' }, genre: {} }),
			),
		).toBeUndefined();
	});

	it('returns undefined for legacy integrated indexes', () => {
		expect(
			getDocumentIndexScoring(
				indexModel({ _values: { type: 'semantic_text', model: 'llama-text-embed-v2' } }),
			),
		).toBeUndefined();
	});

	it('scores a document index by its dense vector field', () => {
		expect(getDocumentIndexScoring(indexModel(denseDocument))).toEqual({
			type: 'dense_vector',
			field: 'embedding',
		});
	});

	it('scores a document index by its integrated embedding field', () => {
		expect(getDocumentIndexScoring(indexModel(embedDocument))).toEqual({
			type: 'embed',
			field: 'text',
		});
	});

	it('prefers the dense vector field when both exist', () => {
		expect(getDocumentIndexScoring(indexModel({ ...embedDocument, ...denseDocument }))).toEqual({
			type: 'dense_vector',
			field: 'embedding',
		});
	});

	it('throws for a document index without a field to search', () => {
		expect(() =>
			getDocumentIndexScoring(indexModel({ body: { type: 'string', fullTextSearch: {} } })),
		).toThrow('has no dense vector field or integrated embedding field');
	});
});

describe('getPineconeVectorStore', () => {
	const embeddings = mock<Embeddings>();
	const describeIndex = vi.fn();
	const search = vi.fn();
	const v9Index = vi.fn();
	const v5Index = vi.fn();
	let indexCounter = 0;
	// The describe cache is module-wide, so every test uses its own index name
	const nextIndexName = () => `idx-${++indexCounter}`;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(PineconeV9).mockImplementation(function () {
			return { describeIndex, index: v9Index } as never;
		});
		vi.mocked(Pinecone).mockImplementation(function () {
			return { Index: v5Index } as never;
		});
		v9Index.mockReturnValue({ documents: { search } });
		v5Index.mockReturnValue('v5-index');
		vi.mocked(PineconeStore.fromExistingIndex).mockResolvedValue('legacy-store' as never);
		embeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);
	});

	it('keeps classic indexes on LangChain PineconeStore', async () => {
		const indexName = nextIndexName();
		describeIndex.mockResolvedValue(indexModel(classic, indexName));

		const store = await getPineconeVectorStore(embeddings, {
			apiKey: 'key',
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
		expect(v9Index).not.toHaveBeenCalled();
	});

	it('keeps the vectors API path when describe fails', async () => {
		describeIndex.mockRejectedValue(new Error('boom'));

		const store = await getPineconeVectorStore(embeddings, {
			apiKey: 'key',
			indexName: nextIndexName(),
		});

		expect(store).toBe('legacy-store');
	});

	it('describes each index once and reuses the result', async () => {
		const indexName = nextIndexName();
		describeIndex.mockResolvedValue(indexModel(classic, indexName));

		await getPineconeVectorStore(embeddings, { apiKey: 'key', indexName });
		await getPineconeVectorStore(embeddings, { apiKey: 'key', indexName });

		expect(describeIndex).toHaveBeenCalledTimes(1);
	});

	it('searches a dense document index through the documents API', async () => {
		const indexName = nextIndexName();
		describeIndex.mockResolvedValue(indexModel(denseDocument, indexName));
		search.mockResolvedValue({
			matches: [
				{
					_id: 'doc-1',
					_score: 0.9,
					text: 'Hello',
					embedding: [1, 2, 3],
					source: 'a.pdf',
				},
			],
		});

		const store = await getPineconeVectorStore(embeddings, {
			apiKey: 'key',
			indexName,
			namespace: 'ns',
			filter: { source: { $eq: 'a.pdf' } },
		});
		const results = await store.similaritySearchWithScore('hi', 3);

		expect(store).toBeInstanceOf(PineconeDocumentStore);
		expect(v9Index).toHaveBeenCalledWith({ host: `${indexName}.svc.pinecone.io`, namespace: 'ns' });
		expect(embeddings.embedQuery).toHaveBeenCalledWith('hi');
		expect(search).toHaveBeenCalledWith({
			scoreBy: [{ type: 'dense_vector', field: 'embedding', values: [0.1, 0.2, 0.3] }],
			topK: 3,
			includeFields: ['*'],
			filter: { source: { $eq: 'a.pdf' } },
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
		describeIndex.mockResolvedValue(indexModel(denseDocument, indexName));
		search.mockResolvedValue({ matches: [] });

		const store = await getPineconeVectorStore(embeddings, {
			apiKey: 'key',
			indexName,
			namespace: '',
			filter: { a: 1 },
		});
		await store.similaritySearchVectorWithScore([1, 1, 1], 2, { b: 2 });

		expect(v9Index).toHaveBeenCalledWith({ host: `${indexName}.svc.pinecone.io` });
		expect(search).toHaveBeenCalledWith(expect.objectContaining({ topK: 2, filter: { b: 2 } }));
	});

	it('sends the query text when Pinecone embeds the index', async () => {
		const indexName = nextIndexName();
		describeIndex.mockResolvedValue(indexModel(embedDocument, indexName));
		search.mockResolvedValue({ matches: [{ _id: 'doc-1', _score: 0.5, text: 'Hello' }] });

		const store = await getPineconeVectorStore(embeddings, { apiKey: 'key', indexName });
		const docs = await store.similaritySearch('hi', 4);

		expect(embeddings.embedQuery).not.toHaveBeenCalled();
		expect(search).toHaveBeenCalledWith({
			scoreBy: [{ type: 'embed', field: 'text', query: 'hi' }],
			topK: 4,
			includeFields: ['*'],
		});
		expect(docs[0].pageContent).toBe('Hello');
		await expect(store.similaritySearchVectorWithScore([1], 4)).rejects.toThrow(
			'needs the query text',
		);
	});

	it('maps page content from the text field option, else the first string field', async () => {
		const indexName = nextIndexName();
		describeIndex.mockResolvedValue(indexModel(denseDocument, indexName));
		search.mockResolvedValue({
			matches: [{ _id: 'doc-1', _score: 0.5, year: 2020, body: 'Body', title: 'Title' }],
		});

		const fallback = await getPineconeVectorStore(embeddings, { apiKey: 'key', indexName });
		const [[fallbackDoc]] = await fallback.similaritySearchVectorWithScore([1, 1, 1], 1);
		expect(fallbackDoc.pageContent).toBe('Body');
		expect(fallbackDoc.metadata).toEqual({ year: 2020, title: 'Title' });

		const configured = await getPineconeVectorStore(embeddings, {
			apiKey: 'key',
			indexName,
			textField: 'title',
		});
		const [[configuredDoc]] = await configured.similaritySearchVectorWithScore([1, 1, 1], 1);
		expect(configuredDoc.pageContent).toBe('Title');
		expect(configuredDoc.metadata).toEqual({ year: 2020, body: 'Body' });
	});

	it('rejects inserts into a document index', async () => {
		const indexName = nextIndexName();
		describeIndex.mockResolvedValue(indexModel(denseDocument, indexName));

		const store = await getPineconeVectorStore(embeddings, { apiKey: 'key', indexName });

		await expect(store.addDocuments([])).rejects.toThrow('not supported yet');
	});
});
