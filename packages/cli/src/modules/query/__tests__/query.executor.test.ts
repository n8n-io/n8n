import type { DataSource } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import type { SqlOnlyStrategy } from '../engine/compiler';
import { ExecutionError } from '../engine/errors';
import { QueryExecutor } from '../query.executor';

const makeStrategy = (overrides: Partial<SqlOnlyStrategy> = {}): SqlOnlyStrategy => ({
	kind: 'sql-only',
	sql: 'SELECT 1',
	params: [],
	columns: ['col'],
	limit: 1000,
	...overrides,
});

describe('QueryExecutor', () => {
	const dataSource = mock<DataSource>();
	const executor = new QueryExecutor(dataSource);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	// ---------------------------------------------------------------- Group 1
	describe('happy path', () => {
		it('returns the rows from the data source', async () => {
			dataSource.query.mockResolvedValue([{ col: 1 }, { col: 2 }]);
			const result = await executor.execute(makeStrategy());
			expect(result.rows).toEqual([{ col: 1 }, { col: 2 }]);
		});
	});

	// ---------------------------------------------------------------- Group 2
	describe('passes sql + params to DataSource', () => {
		it('calls dataSource.query with the strategy sql and params', async () => {
			dataSource.query.mockResolvedValue([]);
			const strategy = makeStrategy({
				sql: 'SELECT a FROM b WHERE c = $1',
				params: ['value'],
			});
			await executor.execute(strategy);
			expect(dataSource.query).toHaveBeenCalledWith('SELECT a FROM b WHERE c = $1', ['value']);
		});
	});

	// ---------------------------------------------------------------- Group 3
	describe('result shape', () => {
		it('exposes columns from the strategy', async () => {
			dataSource.query.mockResolvedValue([]);
			const result = await executor.execute(makeStrategy({ columns: ['a', 'b', 'c'] }));
			expect(result.columns).toEqual(['a', 'b', 'c']);
		});

		it('reports a non-negative durationMs', async () => {
			dataSource.query.mockResolvedValue([]);
			const result = await executor.execute(makeStrategy());
			expect(typeof result.durationMs).toBe('number');
			expect(result.durationMs).toBeGreaterThanOrEqual(0);
		});

		it('returns truncated as a boolean', async () => {
			dataSource.query.mockResolvedValue([]);
			const result = await executor.execute(makeStrategy());
			expect(typeof result.truncated).toBe('boolean');
		});
	});

	// ---------------------------------------------------------------- Group 4
	describe('truncation: true', () => {
		it('flags truncated when rows.length === limit', async () => {
			dataSource.query.mockResolvedValue([{}, {}, {}]);
			const result = await executor.execute(makeStrategy({ limit: 3 }));
			expect(result.truncated).toBe(true);
		});

		it('flags truncated when rows.length > limit (defensive)', async () => {
			dataSource.query.mockResolvedValue([{}, {}, {}, {}]);
			const result = await executor.execute(makeStrategy({ limit: 3 }));
			expect(result.truncated).toBe(true);
		});
	});

	// ---------------------------------------------------------------- Group 5
	describe('truncation: false', () => {
		it('does not flag truncated when rows.length < limit', async () => {
			dataSource.query.mockResolvedValue([{}, {}]);
			const result = await executor.execute(makeStrategy({ limit: 10 }));
			expect(result.truncated).toBe(false);
		});

		it('does not flag truncated for empty result', async () => {
			dataSource.query.mockResolvedValue([]);
			const result = await executor.execute(makeStrategy({ limit: 10 }));
			expect(result.truncated).toBe(false);
		});
	});

	// ---------------------------------------------------------------- Group 6
	describe('statement timeout', () => {
		it('throws STATEMENT_TIMEOUT when the query exceeds timeoutMs', async () => {
			dataSource.query.mockImplementation(
				async () => await new Promise((resolve) => setTimeout(() => resolve([]), 200)),
			);
			let thrown: unknown;
			try {
				await executor.execute(makeStrategy(), { timeoutMs: 50 });
			} catch (err) {
				thrown = err;
			}
			expect(thrown).toBeInstanceOf(ExecutionError);
			expect(thrown).toMatchObject({ code: 'STATEMENT_TIMEOUT' });
		});
	});

	// ---------------------------------------------------------------- Group 7
	describe('DB error wrap', () => {
		it('wraps a thrown error in ExecutionError with EXECUTION_FAILED', async () => {
			dataSource.query.mockRejectedValue(new Error('connection refused'));
			let thrown: unknown;
			try {
				await executor.execute(makeStrategy());
			} catch (err) {
				thrown = err;
			}
			expect(thrown).toBeInstanceOf(ExecutionError);
			expect(thrown).toMatchObject({
				code: 'EXECUTION_FAILED',
				message: expect.stringContaining('connection refused'),
			});
		});

		it('does not re-wrap an ExecutionError thrown internally (e.g. timeout)', async () => {
			dataSource.query.mockImplementation(
				async () => await new Promise((resolve) => setTimeout(() => resolve([]), 200)),
			);
			let thrown: unknown;
			try {
				await executor.execute(makeStrategy(), { timeoutMs: 50 });
			} catch (err) {
				thrown = err;
			}
			expect(thrown).toMatchObject({ code: 'STATEMENT_TIMEOUT' });
		});
	});

	// ---------------------------------------------------------------- Group 8
	describe('custom timeout', () => {
		it('honors caller-supplied timeoutMs (query finishes in time)', async () => {
			dataSource.query.mockImplementation(
				async () => await new Promise((resolve) => setTimeout(() => resolve([]), 20)),
			);
			await expect(executor.execute(makeStrategy(), { timeoutMs: 200 })).resolves.toBeDefined();
		});
	});

	// ---------------------------------------------------------------- Group 9
	describe('empty result', () => {
		it('returns empty rows with columns intact', async () => {
			dataSource.query.mockResolvedValue([]);
			const result = await executor.execute(makeStrategy({ columns: ['a', 'b'] }));
			expect(result).toMatchObject({
				columns: ['a', 'b'],
				rows: [],
				truncated: false,
			});
		});
	});
});
