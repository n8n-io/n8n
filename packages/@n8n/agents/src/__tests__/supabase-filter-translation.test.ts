/**
 * Unit coverage for the PostgREST filter-string translation in
 * `SupabaseVectorStore` — string-building code (quoting, nested
 * `or(...)`/`and(...)` groups) that never runs in CI because the
 * integration suites self-skip without a real Supabase project.
 *
 * Exercises `query()` through the public API with a stubbed PostgREST
 * filter chain (assigned directly to the private `client` field) so no
 * network calls or `@supabase/supabase-js` import happen.
 */
import { describe, expect, it, vi } from 'vitest';

import { SupabaseVectorStore } from '../vector-stores/supabase';

type ChainCall = { method: 'filter' | 'not' | 'or'; args: unknown[] };

function createStub(result: { data: unknown[] | null; error: { message: string } | null }) {
	const calls: ChainCall[] = [];
	let limitArg: number | undefined;
	const chain = {
		filter: (...args: unknown[]) => {
			calls.push({ method: 'filter', args });
			return chain;
		},
		not: (...args: unknown[]) => {
			calls.push({ method: 'not', args });
			return chain;
		},
		or: (...args: unknown[]) => {
			calls.push({ method: 'or', args });
			return chain;
		},
		// eslint-disable-next-line @typescript-eslint/promise-function-async -- no await needed; matches `require-await`
		limit: (n: number) => {
			limitArg = n;
			return Promise.resolve(result);
		},
	};
	const rpc = vi.fn(() => chain);
	return { client: { rpc }, calls, rpc, getLimitArg: () => limitArg };
}

function createStore(queryName?: string): {
	store: SupabaseVectorStore;
	stub: ReturnType<typeof createStub>;
} {
	const store = new SupabaseVectorStore('test-store', {
		url: 'http://localhost',
		apiKey: 'test-key',
		tableName: 'docs',
		...(queryName ? { queryName } : {}),
	});
	const stub = createStub({ data: [], error: null });
	(store as unknown as { client: unknown }).client = stub.client;
	return { store, stub };
}

const containment = (key: string, value: unknown): string => JSON.stringify({ [key]: value });
const quoteOr = (value: string): string =>
	`"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

describe('SupabaseVectorStore filter translation', () => {
	it('invokes rpc with the vector and applies limit, with no filter calls', async () => {
		const { store, stub } = createStore();

		await store.query([1, 2, 3], { topK: 4 });

		expect(stub.rpc).toHaveBeenCalledTimes(1);
		expect(stub.rpc).toHaveBeenCalledWith('match_documents', { query_embedding: [1, 2, 3] });
		expect(stub.calls).toEqual([]);
		expect(stub.getLimitArg()).toBe(4);
	});

	it('uses a custom queryName when provided', async () => {
		const { store, stub } = createStore('custom_fn');

		await store.query([1, 0, 0], { topK: 1 });

		expect(stub.rpc).toHaveBeenCalledWith('custom_fn', { query_embedding: [1, 0, 0] });
	});

	it('translates eq to a single filter call', async () => {
		const { store, stub } = createStore();

		await store.query([0], {
			topK: 1,
			filter: { conditions: [{ key: 'topic', operator: 'eq', value: 'billing' }] },
		});

		expect(stub.calls).toEqual([
			{ method: 'filter', args: ['metadata', 'cs', containment('topic', 'billing')] },
		]);
	});

	it('translates ne to a single not call', async () => {
		const { store, stub } = createStore();

		await store.query([0], {
			topK: 1,
			filter: { conditions: [{ key: 'topic', operator: 'ne', value: 'billing' }] },
		});

		expect(stub.calls).toEqual([
			{ method: 'not', args: ['metadata', 'cs', containment('topic', 'billing')] },
		]);
	});

	it('translates in (AND path) to a single or call', async () => {
		const { store, stub } = createStore();

		await store.query([0], {
			topK: 1,
			filter: { conditions: [{ key: 'topic', operator: 'in', value: ['billing', 'ops'] }] },
		});

		const expected = [
			`metadata.cs.${quoteOr(containment('topic', 'billing'))}`,
			`metadata.cs.${quoteOr(containment('topic', 'ops'))}`,
		].join(',');
		expect(stub.calls).toEqual([{ method: 'or', args: [expected] }]);
	});

	it('translates nin (AND path) to one not call per value', async () => {
		const { store, stub } = createStore();

		await store.query([0], {
			topK: 1,
			filter: { conditions: [{ key: 'topic', operator: 'nin', value: ['billing', 'ops'] }] },
		});

		expect(stub.calls).toEqual([
			{ method: 'not', args: ['metadata', 'cs', containment('topic', 'billing')] },
			{ method: 'not', args: ['metadata', 'cs', containment('topic', 'ops')] },
		]);
	});

	it('combines in with another condition under AND, in condition order', async () => {
		const { store, stub } = createStore();

		await store.query([0], {
			topK: 1,
			filter: {
				conditions: [
					{ key: 'topic', operator: 'in', value: ['billing', 'ops'] },
					{ key: 'active', operator: 'eq', value: true },
				],
				combineWith: 'and',
			},
		});

		const orExpected = [
			`metadata.cs.${quoteOr(containment('topic', 'billing'))}`,
			`metadata.cs.${quoteOr(containment('topic', 'ops'))}`,
		].join(',');
		expect(stub.calls).toEqual([
			{ method: 'or', args: [orExpected] },
			{ method: 'filter', args: ['metadata', 'cs', containment('active', true)] },
		]);
	});

	it('builds a single or call for a combineWith "or" group with all operators', async () => {
		const { store, stub } = createStore();

		await store.query([0], {
			topK: 1,
			filter: {
				conditions: [
					{ key: 'topic', operator: 'eq', value: 'billing' },
					{ key: 'count', operator: 'ne', value: 5 },
					{ key: 'category', operator: 'in', value: ['a', 'b'] },
					{ key: 'category', operator: 'nin', value: ['c'] },
				],
				combineWith: 'or',
			},
		});

		const expected = [
			`metadata.cs.${quoteOr(containment('topic', 'billing'))}`,
			`metadata.not.cs.${quoteOr(containment('count', 5))}`,
			`or(metadata.cs.${quoteOr(containment('category', 'a'))},metadata.cs.${quoteOr(containment('category', 'b'))})`,
			`and(metadata.not.cs.${quoteOr(containment('category', 'c'))})`,
		].join(',');
		expect(stub.calls).toEqual([{ method: 'or', args: [expected] }]);
	});

	it('escapes quotes and backslashes in OR-combined logic terms', async () => {
		const { store, stub } = createStore();

		await store.query([0], {
			topK: 1,
			filter: {
				conditions: [{ key: 'k', operator: 'eq', value: 'a"b\\c' }],
				combineWith: 'or',
			},
		});

		const expected = `metadata.cs.${quoteOr(containment('k', 'a"b\\c'))}`;
		expect(stub.calls).toEqual([{ method: 'or', args: [expected] }]);
	});

	it('rejects an empty array for in without calling the filter chain', async () => {
		const { store, stub } = createStore();

		await expect(
			store.query([0], {
				topK: 1,
				filter: { conditions: [{ key: 'topic', operator: 'in', value: [] }] },
			}),
		).rejects.toThrow(/requires a non-empty array value/);
		expect(stub.calls).toEqual([]);
	});

	it('rejects an empty array for nin without calling the filter chain', async () => {
		const { store, stub } = createStore();

		await expect(
			store.query([0], {
				topK: 1,
				filter: { conditions: [{ key: 'topic', operator: 'nin', value: [] }] },
			}),
		).rejects.toThrow(/requires a non-empty array value/);
		expect(stub.calls).toEqual([]);
	});

	it('wraps a PostgREST error with a descriptive message', async () => {
		const store = new SupabaseVectorStore('test-store', {
			url: 'http://localhost',
			apiKey: 'test-key',
			tableName: 'docs',
		});
		const stub = createStub({ data: null, error: { message: 'boom' } });
		(store as unknown as { client: unknown }).client = stub.client;

		await expect(store.query([0], { topK: 1 })).rejects.toThrow('Supabase query failed: boom');
	});

	it('maps rows to query results, coercing id to a string and defaulting metadata', async () => {
		const store = new SupabaseVectorStore('test-store', {
			url: 'http://localhost',
			apiKey: 'test-key',
			tableName: 'docs',
		});
		const stub = createStub({
			data: [{ id: 7, content: 'c', metadata: null, similarity: 0.5 }],
			error: null,
		});
		(store as unknown as { client: unknown }).client = stub.client;

		const results = await store.query([0], { topK: 1 });

		expect(results).toEqual([{ id: '7', content: 'c', metadata: {}, score: 0.5 }]);
	});
});
