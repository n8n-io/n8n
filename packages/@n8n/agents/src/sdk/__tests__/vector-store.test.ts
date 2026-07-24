import { MockEmbeddingModelV3 } from 'ai/test';

import type { BuiltVectorStoreBackend, VectorFilter, VectorQueryResult } from '../../types';
import { isZodSchema } from '../../utils/zod';
import { Agent } from '../agent';
import { sanitizeToolName } from '../tool';
import { VectorStore } from '../vector-store';
import { assertValidFilter, normalizeFilterInput } from '../vector-store-filter';

function makeEmbeddingModel(vector: number[] = [1, 0, 0]) {
	return new MockEmbeddingModelV3({
		doEmbed: async ({ values }) =>
			await Promise.resolve({
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

describe('normalizeFilterInput', () => {
	it('wraps plain object shorthand into an eq-conditions AND group', () => {
		expect(normalizeFilterInput({ plan: 'cloud' })).toEqual({
			conditions: [{ key: 'plan', operator: 'eq', value: 'cloud' }],
			combineWith: 'and',
		});
	});

	it('passes a VectorFilter through unchanged', () => {
		const filter: VectorFilter = {
			conditions: [{ key: 'plan', operator: 'eq', value: 'cloud' }],
			combineWith: 'or',
		};
		expect(normalizeFilterInput(filter)).toBe(filter);
	});
});

describe('assertValidFilter', () => {
	it('throws when in has a non-array or empty-array value', () => {
		expect(() =>
			assertValidFilter({ conditions: [{ key: 'plan', operator: 'in', value: 'cloud' }] }),
		).toThrow(/"in" on key "plan" requires a non-empty array value/);
		expect(() =>
			assertValidFilter({ conditions: [{ key: 'plan', operator: 'in', value: [] }] }),
		).toThrow(/"in" on key "plan" requires a non-empty array value/);
	});

	it('throws when eq has an array value', () => {
		expect(() =>
			assertValidFilter({ conditions: [{ key: 'plan', operator: 'eq', value: ['cloud'] }] }),
		).toThrow(/"eq" on key "plan" requires a string, number, or boolean value/);
	});

	it('throws when in/nin has a non-string/number array element', () => {
		expect(() =>
			assertValidFilter({
				conditions: [{ key: 'plan', operator: 'in', value: [true as never] }],
			}),
		).toThrow(/"in" on key "plan" requires array elements to be strings or numbers/);
	});

	it('throws on an unknown (removed) operator', () => {
		expect(() =>
			assertValidFilter({
				conditions: [{ key: 'plan', operator: 'text_match' as never, value: 'cloud' }],
			}),
		).toThrow(/Invalid filter operator "text_match"/);
	});
});

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
	it('embeds the query and calls backend.query with resolved topK', async () => {
		const backend = makeBackend();
		const vectorStore = new VectorStore('kb')
			.store(backend)
			.embeddingModel(makeEmbeddingModel([1, 2, 3]));

		await vectorStore.search('hello');
		expect(backend.query).toHaveBeenCalledWith([1, 2, 3], { topK: 4 });

		await vectorStore.search('hello', { topK: 10 });
		expect(backend.query).toHaveBeenLastCalledWith([1, 2, 3], { topK: 10 });
	});

	it('returns the results from the backend', async () => {
		const results: VectorQueryResult[] = [{ id: '1', content: 'a', metadata: {}, score: 0.9 }];
		const backend = makeBackend({ query: vi.fn().mockResolvedValue(results) });
		const vectorStore = new VectorStore('kb').store(backend).embeddingModel(makeEmbeddingModel());

		await expect(vectorStore.search('hello')).resolves.toEqual(results);
	});

	it('normalizes an object-shorthand per-call filter before reaching the backend', async () => {
		const backend = makeBackend();
		const vectorStore = new VectorStore('kb').store(backend).embeddingModel(makeEmbeddingModel());

		await vectorStore.search('hello', { filter: { plan: 'cloud' } });

		expect(backend.query).toHaveBeenCalledWith([1, 0, 0], {
			topK: 4,
			filter: { conditions: [{ key: 'plan', operator: 'eq', value: 'cloud' }], combineWith: 'and' },
		});
	});

	it('omits filter when an empty object shorthand is passed', async () => {
		const backend = makeBackend();
		const vectorStore = new VectorStore('kb').store(backend).embeddingModel(makeEmbeddingModel());

		await vectorStore.search('hello', { filter: {} });

		expect(backend.query).toHaveBeenCalledWith([1, 0, 0], { topK: 4 });
	});

	it('rejects a non-integer or non-positive topK on the builder', () => {
		const vectorStore = new VectorStore('kb');

		expect(() => vectorStore.topK(0)).toThrow(/topK must be an integer >= 1/);
		expect(() => vectorStore.topK(-5)).toThrow(/topK must be an integer >= 1/);
		expect(() => vectorStore.topK(2.5)).toThrow(/topK must be an integer >= 1/);
		expect(() => vectorStore.topK(NaN)).toThrow(/topK must be an integer >= 1/);
	});

	it('rejects an invalid per-call topK without touching the backend', async () => {
		const backend = makeBackend();
		const vectorStore = new VectorStore('kb').store(backend).embeddingModel(makeEmbeddingModel());

		await expect(vectorStore.search('hello', { topK: 0 })).rejects.toThrow(
			/topK must be an integer >= 1/,
		);
		expect(backend.query).not.toHaveBeenCalled();
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

	it('upserts records with embeddings, provided metadata, and a default of {}', async () => {
		const backend = makeBackend();
		const vectorStore = new VectorStore('kb')
			.store(backend)
			.embeddingModel(makeEmbeddingModel([1, 0, 0]));

		const ids = await vectorStore.addDocuments([
			{ content: 'hello', metadata: { topic: 'a' } },
			{ content: 'world' },
		]);

		expect(backend.upsert).toHaveBeenCalledWith([
			{ id: ids[0], vector: [1, 0, 0], content: 'hello', metadata: { topic: 'a' } },
			{ id: ids[1], vector: [1, 0, 0], content: 'world', metadata: {} },
		]);
	});

	it('rejects an empty-content document, naming its index', async () => {
		const backend = makeBackend();
		const vectorStore = new VectorStore('kb').store(backend).embeddingModel(makeEmbeddingModel());

		await expect(vectorStore.addDocuments([{ content: '' }])).rejects.toThrow(
			/Document at index 0 has empty content/,
		);
	});

	it('rejects a whitespace-only content document without touching the backend', async () => {
		const backend = makeBackend();
		const vectorStore = new VectorStore('kb').store(backend).embeddingModel(makeEmbeddingModel());

		await expect(vectorStore.addDocuments([{ content: 'ok' }, { content: '   ' }])).rejects.toThrow(
			/Document at index 1 has empty content/,
		);
		expect(backend.upsert).not.toHaveBeenCalled();
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

		expect(tool.name).toBe('search_product-docs');
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
			{ name: 'search_product-docs', description: 'Search the docs' },
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

	it('without filterableKeys, the schema has no filter field', () => {
		const vectorStore = new VectorStore('product-docs').description('Search the docs');
		const tool = vectorStore.asTool().build();

		expect(isZodSchema(tool.inputSchema)).toBe(true);
		if (!isZodSchema(tool.inputSchema)) return;
		const parsed = tool.inputSchema.safeParse({
			query: 'hello',
			filter: [{ key: 'x', operator: 'eq', value: 'y' }],
		});
		expect(parsed.success).toBe(true);
		expect(parsed.data).toEqual({ query: 'hello' });
	});

	describe('with filterableKeys', () => {
		it('accepts a valid filter array', () => {
			const vectorStore = new VectorStore('product-docs').description('Search the docs');
			const tool = vectorStore.asTool({ filterableKeys: { plan: 'cloud or self-hosted' } }).build();

			expect(isZodSchema(tool.inputSchema)).toBe(true);
			if (!isZodSchema(tool.inputSchema)) return;
			const parsed = tool.inputSchema.safeParse({
				query: 'hello',
				filter: [{ key: 'plan', operator: 'eq', value: 'cloud' }],
			});
			expect(parsed.success).toBe(true);
		});

		it('rejects a filter key outside filterableKeys', () => {
			const vectorStore = new VectorStore('product-docs').description('Search the docs');
			const tool = vectorStore.asTool({ filterableKeys: { plan: 'cloud or self-hosted' } }).build();

			expect(isZodSchema(tool.inputSchema)).toBe(true);
			if (!isZodSchema(tool.inputSchema)) return;
			const parsed = tool.inputSchema.safeParse({
				query: 'hello',
				filter: [{ key: 'unlisted', operator: 'eq', value: 'x' }],
			});
			expect(parsed.success).toBe(false);
		});

		it('rejects an unknown (removed) operator', () => {
			const vectorStore = new VectorStore('product-docs').description('Search the docs');
			const tool = vectorStore.asTool({ filterableKeys: { plan: 'cloud or self-hosted' } }).build();

			expect(isZodSchema(tool.inputSchema)).toBe(true);
			if (!isZodSchema(tool.inputSchema)) return;
			const parsed = tool.inputSchema.safeParse({
				query: 'hello',
				filter: [{ key: 'plan', operator: 'text_match', value: 'x' }],
			});
			expect(parsed.success).toBe(false);
		});

		it('rejects an array value for a scalar operator (eq/ne)', () => {
			const vectorStore = new VectorStore('product-docs').description('Search the docs');
			const tool = vectorStore.asTool({ filterableKeys: { plan: 'cloud or self-hosted' } }).build();

			expect(isZodSchema(tool.inputSchema)).toBe(true);
			if (!isZodSchema(tool.inputSchema)) return;
			const parsed = tool.inputSchema.safeParse({
				query: 'hello',
				filter: [{ key: 'plan', operator: 'eq', value: ['cloud'] }],
			});
			expect(parsed.success).toBe(false);
		});

		it('rejects a scalar value for an array operator (in/nin)', () => {
			const vectorStore = new VectorStore('product-docs').description('Search the docs');
			const tool = vectorStore.asTool({ filterableKeys: { plan: 'cloud or self-hosted' } }).build();

			expect(isZodSchema(tool.inputSchema)).toBe(true);
			if (!isZodSchema(tool.inputSchema)) return;
			const parsed = tool.inputSchema.safeParse({
				query: 'hello',
				filter: [{ key: 'plan', operator: 'in', value: 'cloud' }],
			});
			expect(parsed.success).toBe(false);
		});

		it('rejects a condition missing a value', () => {
			const vectorStore = new VectorStore('product-docs').description('Search the docs');
			const tool = vectorStore.asTool({ filterableKeys: { plan: 'cloud or self-hosted' } }).build();

			expect(isZodSchema(tool.inputSchema)).toBe(true);
			if (!isZodSchema(tool.inputSchema)) return;
			const parsed = tool.inputSchema.safeParse({
				query: 'hello',
				filter: [{ key: 'plan', operator: 'eq' }],
			});
			expect(parsed.success).toBe(false);
		});

		it('passes the model filter to backend.query as the single filter group', async () => {
			const backend = makeBackend();
			const vectorStore = new VectorStore('product-docs')
				.store(backend)
				.embeddingModel(makeEmbeddingModel())
				.description('Search the docs');
			const tool = vectorStore.asTool({ filterableKeys: { plan: 'cloud or self-hosted' } }).build();

			await tool.handler!(
				{ query: 'hello', filter: [{ key: 'plan', operator: 'eq', value: 'cloud' }] },
				{},
			);

			expect(backend.query).toHaveBeenCalledWith([1, 0, 0], {
				topK: 4,
				filter: {
					conditions: [{ key: 'plan', operator: 'eq', value: 'cloud' }],
					combineWith: 'and',
				},
			});
		});

		it('omits the filter key when the model calls without a filter', async () => {
			const backend = makeBackend();
			const vectorStore = new VectorStore('product-docs')
				.store(backend)
				.embeddingModel(makeEmbeddingModel())
				.description('Search the docs');
			const tool = vectorStore.asTool({ filterableKeys: { plan: 'cloud or self-hosted' } }).build();

			await tool.handler!({ query: 'hello' }, {});

			expect(backend.query).toHaveBeenCalledWith([1, 0, 0], { topK: 4 });
		});
	});
});

describe('sanitizeToolName', () => {
	it('preserves hyphens', () => {
		expect(sanitizeToolName('product-docs')).toBe('product-docs');
	});

	it('collapses runs of invalid characters into a single underscore', () => {
		expect(sanitizeToolName('My Docs!!')).toBe('My_Docs_');
	});

	it('truncates to 64 chars with no trailing underscore or hyphen', () => {
		const sanitized = sanitizeToolName('x'.repeat(80));

		expect(sanitized.length).toBeLessThanOrEqual(64);
		expect(sanitized).not.toMatch(/[_-]$/);
	});

	it('caps the composed default tool name in asTool() at 64 chars', () => {
		const tool = new VectorStore('x'.repeat(80)).description('d').asTool().build();

		expect(tool.name.length).toBeLessThanOrEqual(64);
		expect(tool.name.startsWith('search_')).toBe(true);
	});
});
