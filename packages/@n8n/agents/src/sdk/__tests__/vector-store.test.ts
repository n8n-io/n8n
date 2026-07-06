import { MockEmbeddingModelV3 } from 'ai/test';

import { Agent } from '../agent';
import { VectorStore } from '../vector-store';
import type { BuiltVectorStoreBackend, VectorQueryResult } from '../../types';

function makeEmbeddingModel(vector: number[] = [1, 0, 0]) {
	return new MockEmbeddingModelV3({
		doEmbed: async ({ values }) => ({
			embeddings: values.map(() => vector),
			warnings: [],
		}),
	});
}

function makeBackend(overrides: Partial<BuiltVectorStoreBackend> = {}): BuiltVectorStoreBackend {
	return {
		upsert: vi.fn().mockResolvedValue(undefined),
		query: vi.fn().mockResolvedValue([]),
		delete: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe('VectorStore — configuration validation', () => {
	it('throws when .store() is not set', async () => {
		const vectorStore = new VectorStore('kb').embeddingModel(makeEmbeddingModel());
		await expect(vectorStore.search('hello')).rejects.toThrow(/requires a backend/);
	});

	it('throws when .embeddingModel() is not set', async () => {
		const vectorStore = new VectorStore('kb').store(makeBackend());
		await expect(vectorStore.search('hello')).rejects.toThrow(/requires an embedding model/);
	});
});

describe('VectorStore — search()', () => {
	it('embeds the query and calls backend.query with default topK', async () => {
		const backend = makeBackend();
		const vectorStore = new VectorStore('kb')
			.store(backend)
			.embeddingModel(makeEmbeddingModel([1, 2, 3]));

		await vectorStore.search('hello');

		expect(backend.query).toHaveBeenCalledWith([1, 2, 3], { topK: 4 });
	});

	it('returns the results from the backend', async () => {
		const results: VectorQueryResult[] = [{ id: '1', content: 'a', metadata: {}, score: 0.9 }];
		const backend = makeBackend({ query: vi.fn().mockResolvedValue(results) });
		const vectorStore = new VectorStore('kb').store(backend).embeddingModel(makeEmbeddingModel());

		await expect(vectorStore.search('hello')).resolves.toEqual(results);
	});

	it('passes an overridden topK through to backend.query', async () => {
		const backend = makeBackend();
		const vectorStore = new VectorStore('kb').store(backend).embeddingModel(makeEmbeddingModel());

		await vectorStore.search('hello', { topK: 10 });

		expect(backend.query).toHaveBeenCalledWith([1, 0, 0], { topK: 10 });
	});

	it('calls ensureReady only once across multiple searches', async () => {
		const ensureReady = vi.fn().mockResolvedValue(undefined);
		const backend = makeBackend({ ensureReady });
		const vectorStore = new VectorStore('kb')
			.store(backend)
			.embeddingModel(makeEmbeddingModel([1, 0, 0]));

		await vectorStore.search('one');
		await vectorStore.search('two');

		expect(ensureReady).toHaveBeenCalledTimes(1);
		expect(ensureReady).toHaveBeenCalledWith({ dimensions: 3 });
	});
});

describe('VectorStore — addDocuments()', () => {
	it('returns [] and never touches the embedder or backend for an empty array', async () => {
		const backend = makeBackend();
		const embeddingModel = makeEmbeddingModel();
		const vectorStore = new VectorStore('kb').store(backend).embeddingModel(embeddingModel);

		const ids = await vectorStore.addDocuments([]);

		expect(ids).toEqual([]);
		expect(backend.upsert).not.toHaveBeenCalled();
	});

	it('generates an id when none is provided and preserves a given id', async () => {
		const backend = makeBackend();
		const vectorStore = new VectorStore('kb')
			.store(backend)
			.embeddingModel(makeEmbeddingModel([1, 0, 0]));

		const ids = await vectorStore.addDocuments([
			{ content: 'no id given' },
			{ id: 'explicit-id', content: 'has an id' },
		]);

		expect(ids[1]).toBe('explicit-id');
		expect(ids[0]).toEqual(expect.any(String));
		expect(ids[0]).not.toBe('explicit-id');
	});

	it('upserts records with embeddings and provided metadata', async () => {
		const backend = makeBackend();
		const vectorStore = new VectorStore('kb')
			.store(backend)
			.embeddingModel(makeEmbeddingModel([1, 0, 0]));

		const ids = await vectorStore.addDocuments([{ content: 'hello', metadata: { topic: 'a' } }]);

		expect(backend.upsert).toHaveBeenCalledWith([
			{ id: ids[0], vector: [1, 0, 0], content: 'hello', metadata: { topic: 'a' } },
		]);
	});

	it('defaults metadata to {} when not provided', async () => {
		const backend = makeBackend();
		const vectorStore = new VectorStore('kb')
			.store(backend)
			.embeddingModel(makeEmbeddingModel([1, 0, 0]));

		await vectorStore.addDocuments([{ content: 'hello' }]);

		expect(backend.upsert).toHaveBeenCalledWith([
			expect.objectContaining({ content: 'hello', metadata: {} }),
		]);
	});
});

describe('VectorStore — deleteDocuments()', () => {
	it('returns early and never touches the backend for an empty array', async () => {
		const backend = makeBackend();
		const vectorStore = new VectorStore('kb').store(backend).embeddingModel(makeEmbeddingModel());

		await vectorStore.deleteDocuments([]);

		expect(backend.delete).not.toHaveBeenCalled();
	});

	it('calls backend.delete with the given ids', async () => {
		const backend = makeBackend();
		const vectorStore = new VectorStore('kb').store(backend).embeddingModel(makeEmbeddingModel());

		await vectorStore.deleteDocuments(['a', 'b']);

		expect(backend.delete).toHaveBeenCalledWith({ ids: ['a', 'b'] });
	});
});

describe('VectorStore — asTool()', () => {
	it('defaults the tool name to search_<sanitized store name>', () => {
		const vectorStore = new VectorStore('product-docs').description('Search the docs');
		const tool = vectorStore.asTool().build();

		expect(tool.name).toBe('search_product_docs');
	});

	it('throws when no description is set anywhere', () => {
		const vectorStore = new VectorStore('product-docs');

		expect(() => vectorStore.asTool()).toThrow(/requires a description/);
	});

	it('uses the per-call description over the builder default', () => {
		const vectorStore = new VectorStore('product-docs').description('default description');
		const tool = vectorStore.asTool({ description: 'override description' }).build();

		expect(tool.description).toBe('override description');
	});

	it('Agent.vectorStore() registers a search_<name> tool', () => {
		const vectorStore = new VectorStore('product-docs').description('Search the docs');
		const agent = new Agent('assistant').vectorStore(vectorStore);

		expect(agent.snapshot.tools).toEqual([
			{ name: 'search_product_docs', description: 'Search the docs' },
		]);
	});

	it('handler returns { results } from search()', async () => {
		const results: VectorQueryResult[] = [{ id: '1', content: 'a', metadata: {}, score: 0.9 }];
		const backend = makeBackend({ query: vi.fn().mockResolvedValue(results) });
		const vectorStore = new VectorStore('product-docs')
			.store(backend)
			.embeddingModel(makeEmbeddingModel())
			.description('Search the docs');
		const tool = vectorStore.asTool().build();

		const output = await tool.handler!({ query: 'hello' }, {});

		expect(output).toEqual({ results });
	});
});
