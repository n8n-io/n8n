import type { DataSource } from '@n8n/typeorm';
import { stringify as flattedStringify } from 'flatted';
import { mock } from 'jest-mock-extended';

import type { SqlPlusJsStrategy } from '../engine/compiler';
import { QueryExecutor } from '../query.executor';

const makeStrategy = (overrides: Partial<SqlPlusJsStrategy> = {}): SqlPlusJsStrategy => ({
	kind: 'sql+js',
	fetch: { sql: 'SELECT _execution_id, _executed_at, _raw FROM ...', params: [] },
	residual: {
		nodeName: 'Form1',
		projection: [{ kind: 'star' }],
	},
	limit: 1000,
	...overrides,
});

/**
 * Builds a flatted-encoded blob shaped like a real execution_data.data column,
 * with the named node having produced the given items as its first run output.
 */
const fakeRawData = (nodeName: string, items: Array<Record<string, unknown>>): string =>
	flattedStringify({
		resultData: {
			runData: {
				[nodeName]: [
					{
						startTime: 0,
						executionTime: 0,
						data: {
							main: [items.map((json) => ({ json }))],
						},
					},
				],
			},
		},
	});

describe('QueryExecutor — Path B (sql+js)', () => {
	const dataSource = mock<DataSource>();
	const executor = new QueryExecutor(dataSource);

	beforeEach(() => jest.clearAllMocks());

	// ---------------------------------------------------------------- Group 1
	describe('happy path', () => {
		it('extracts items from the flatted blob and injects meta columns', async () => {
			dataSource.query.mockResolvedValue([
				{
					_execution_id: 42,
					_executed_at: '2024-01-01',
					_raw: fakeRawData('Form1', [{ name: 'alice' }, { name: 'bob' }]),
				},
			]);

			const result = await executor.execute(makeStrategy());

			expect(result.rows).toEqual([
				{ name: 'alice', _execution_id: 42, _executed_at: '2024-01-01' },
				{ name: 'bob', _execution_id: 42, _executed_at: '2024-01-01' },
			]);
		});
	});

	// ---------------------------------------------------------------- Group 2
	describe('unions across multiple executions', () => {
		it('emits items from each execution in fetch order', async () => {
			dataSource.query.mockResolvedValue([
				{
					_execution_id: 2,
					_executed_at: '2024-02',
					_raw: fakeRawData('Form1', [{ name: 'x' }]),
				},
				{
					_execution_id: 1,
					_executed_at: '2024-01',
					_raw: fakeRawData('Form1', [{ name: 'y' }, { name: 'z' }]),
				},
			]);

			const result = await executor.execute(makeStrategy());

			expect(result.rows.map((r) => r.name)).toEqual(['x', 'y', 'z']);
		});
	});

	// ---------------------------------------------------------------- Group 3
	describe('projection — explicit columns', () => {
		it('keeps only the requested keys, fills missing with null', async () => {
			dataSource.query.mockResolvedValue([
				{
					_execution_id: 1,
					_executed_at: '2024',
					_raw: fakeRawData('Form1', [{ name: 'alice', age: 30, extra: 'ignored' }]),
				},
			]);

			const result = await executor.execute(
				makeStrategy({
					residual: {
						nodeName: 'Form1',
						projection: [
							{ kind: 'column', name: 'name' },
							{ kind: 'column', name: 'missing' },
						],
					},
				}),
			);

			expect(result.rows).toEqual([{ name: 'alice', missing: null }]);
		});
	});

	// ---------------------------------------------------------------- Group 4
	describe('filter', () => {
		it('drops items that fail the WHERE predicate', async () => {
			dataSource.query.mockResolvedValue([
				{
					_execution_id: 1,
					_executed_at: '2024',
					_raw: fakeRawData('Form1', [{ score: 80 }, { score: 50 }, { score: 95 }]),
				},
			]);

			const result = await executor.execute(
				makeStrategy({
					residual: {
						nodeName: 'Form1',
						projection: [{ kind: 'star' }],
						filter: { kind: 'compare', op: '>', field: 'score', value: 60 },
					},
				}),
			);

			expect(result.rows.map((r) => r.score)).toEqual([80, 95]);
		});

		it('supports AND / OR composition', async () => {
			dataSource.query.mockResolvedValue([
				{
					_execution_id: 1,
					_executed_at: '2024',
					_raw: fakeRawData('Form1', [
						{ k: 'a', v: 1 },
						{ k: 'b', v: 2 },
						{ k: 'b', v: 3 },
					]),
				},
			]);

			const result = await executor.execute(
				makeStrategy({
					residual: {
						nodeName: 'Form1',
						projection: [{ kind: 'star' }],
						filter: {
							kind: 'and',
							left: { kind: 'compare', op: '=', field: 'k', value: 'b' },
							right: { kind: 'compare', op: '>', field: 'v', value: 2 },
						},
					},
				}),
			);

			expect(result.rows.map((r) => r.v)).toEqual([3]);
		});
	});

	// ---------------------------------------------------------------- Group 5
	describe('LIMIT', () => {
		it('caps output rows at strategy.limit', async () => {
			dataSource.query.mockResolvedValue([
				{
					_execution_id: 1,
					_executed_at: '2024',
					_raw: fakeRawData('Form1', [{ i: 1 }, { i: 2 }, { i: 3 }, { i: 4 }, { i: 5 }]),
				},
			]);

			const result = await executor.execute(makeStrategy({ limit: 3 }));

			expect(result.rows).toHaveLength(3);
			expect(result.truncated).toBe(true);
		});

		it('does not flag truncated when under the limit', async () => {
			dataSource.query.mockResolvedValue([
				{
					_execution_id: 1,
					_executed_at: '2024',
					_raw: fakeRawData('Form1', [{ i: 1 }, { i: 2 }]),
				},
			]);
			const result = await executor.execute(makeStrategy({ limit: 100 }));
			expect(result.truncated).toBe(false);
		});
	});

	// ---------------------------------------------------------------- Group 6
	describe('missing or malformed node data', () => {
		it('returns no rows when the node never ran', async () => {
			dataSource.query.mockResolvedValue([
				{
					_execution_id: 1,
					_executed_at: '2024',
					_raw: fakeRawData('OtherNode', [{ x: 1 }]),
				},
			]);
			const result = await executor.execute(makeStrategy());
			expect(result.rows).toEqual([]);
		});

		it('returns no rows when the raw blob is unparseable', async () => {
			dataSource.query.mockResolvedValue([
				{ _execution_id: 1, _executed_at: '2024', _raw: 'not-flatted' },
			]);
			const result = await executor.execute(makeStrategy());
			expect(result.rows).toEqual([]);
		});

		it('returns no rows when fetched set is empty', async () => {
			dataSource.query.mockResolvedValue([]);
			const result = await executor.execute(makeStrategy());
			expect(result.rows).toEqual([]);
			expect(result.truncated).toBe(false);
		});
	});

	// ---------------------------------------------------------------- Group 7
	describe('columns derivation', () => {
		it('for SELECT * — union of keys, meta columns included', async () => {
			dataSource.query.mockResolvedValue([
				{
					_execution_id: 1,
					_executed_at: '2024',
					_raw: fakeRawData('Form1', [{ a: 1 }, { a: 2, b: 3 }]),
				},
			]);
			const result = await executor.execute(makeStrategy());
			expect(new Set(result.columns)).toEqual(new Set(['_execution_id', '_executed_at', 'a', 'b']));
		});

		it('for explicit columns — exactly the requested list', async () => {
			dataSource.query.mockResolvedValue([
				{
					_execution_id: 1,
					_executed_at: '2024',
					_raw: fakeRawData('Form1', [{ a: 1, b: 2 }]),
				},
			]);
			const result = await executor.execute(
				makeStrategy({
					residual: {
						nodeName: 'Form1',
						projection: [{ kind: 'column', name: 'a' }],
					},
				}),
			);
			expect(result.columns).toEqual(['a']);
		});
	});

	// ---------------------------------------------------------------- Group 8
	describe('ORDER BY', () => {
		it('sorts result rows by a column', async () => {
			dataSource.query.mockResolvedValue([
				{
					_execution_id: 1,
					_executed_at: '2024',
					_raw: fakeRawData('Form1', [{ n: 3 }, { n: 1 }, { n: 2 }]),
				},
			]);

			const result = await executor.execute(
				makeStrategy({
					residual: {
						nodeName: 'Form1',
						projection: [{ kind: 'star' }],
						orderBy: [{ kind: 'column', field: 'n', direction: 'asc' }],
					},
				}),
			);

			expect(result.rows.map((r) => r.n)).toEqual([1, 2, 3]);
		});

		it('sorts descending', async () => {
			dataSource.query.mockResolvedValue([
				{
					_execution_id: 1,
					_executed_at: '2024',
					_raw: fakeRawData('Form1', [{ n: 1 }, { n: 3 }, { n: 2 }]),
				},
			]);

			const result = await executor.execute(
				makeStrategy({
					residual: {
						nodeName: 'Form1',
						projection: [{ kind: 'star' }],
						orderBy: [{ kind: 'column', field: 'n', direction: 'desc' }],
					},
				}),
			);

			expect(result.rows.map((r) => r.n)).toEqual([3, 2, 1]);
		});
	});
});
