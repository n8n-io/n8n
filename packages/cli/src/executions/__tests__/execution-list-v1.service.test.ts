import type { DatabaseConfig } from '@n8n/config';
import type { ExecutionRepository, ExecutionSummaries } from '@n8n/db';
import type { ExecutionSummary } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { encodeExecutionCursor } from '../execution-cursor';
import { COMPLETED_STATUSES, ExecutionListV1Service } from '../execution-list-v1.service';

describe('ExecutionListV1Service', () => {
	const databaseConfig = mock<DatabaseConfig>();
	const executionRepository = mock<ExecutionRepository>();
	const service = new ExecutionListV1Service(databaseConfig, executionRepository);

	const startedAt = new Date('2026-09-07T12:00:00.000Z');
	const row = (id: string, status: ExecutionSummary['status'] = 'success') =>
		mock<ExecutionSummary>({ id, status, startedAt, createdAt: startedAt });

	const query = (
		overrides: Partial<ExecutionSummaries.RangeQuery> = {},
	): ExecutionSummaries.RangeQuery => ({
		kind: 'range',
		range: { limit: 2 },
		...overrides,
	});

	/** The `query` above, as the caller narrows it when the two blocks combine. */
	const completedPageQuery = (overrides: Partial<ExecutionSummaries.RangeQuery> = {}) =>
		query({ order: { startedAt: 'DESC' }, status: COMPLETED_STATUSES, ...overrides });

	/** Every `findManyByRangeQuery` call, paired with the statuses it asked for. */
	const rangeQueries = () => executionRepository.findManyByRangeQuery.mock.calls.map(([q]) => q);
	const currentQuery = () => rangeQueries().find((q) => q.status?.includes('running'));
	const completedQuery = () => rangeQueries().find((q) => !q.status?.includes('running'));

	beforeEach(() => {
		vi.resetAllMocks();
		databaseConfig.type = 'sqlite';
		executionRepository.findManyByRangeQuery.mockResolvedValue([]);
		executionRepository.fetchCount.mockResolvedValue(0);
	});

	describe('findCurrentAndCompleted', () => {
		it('puts the current block on top and counts the completed page alone', async () => {
			executionRepository.findManyByRangeQuery.mockImplementation(async (q) =>
				q.status?.includes('running') ? [row('20', 'running')] : [row('10'), row('9')],
			);
			executionRepository.fetchCount.mockResolvedValue(7);

			const result = await service.findCurrentAndCompleted(completedPageQuery());

			expect(result.results.map((r) => r.id)).toEqual(['20', '10', '9']);
			// The count covers the paginated page only, so "current" is excluded.
			expect(result.count).toBe(7);
			expect(currentQuery()?.order).toEqual({ top: 'running' });
			expect(completedQuery()?.status).toEqual(COMPLETED_STATUSES);
		});

		it('refetches current in full, ignoring the caller beforeId', async () => {
			await service.findCurrentAndCompleted(
				completedPageQuery({ range: { limit: 2, beforeId: '99' } }),
			);

			expect(currentQuery()?.range).not.toHaveProperty('beforeId');
			expect(completedQuery()?.range.beforeId).toBe('99');
		});
	});

	describe('nextCursor', () => {
		it('returns a cursor for the last row when the page is full', async () => {
			executionRepository.findManyByRangeQuery.mockResolvedValue([row('2'), row('1')]);

			const { nextCursor } = await service.findPageWithCount(query({ range: { limit: 2 } }));

			expect(nextCursor).toBe(
				encodeExecutionCursor({
					version: 1,
					v1: { id: '1', timestamp: startedAt.toISOString() },
				}),
			);
		});

		it('returns null when the page is partial', async () => {
			executionRepository.findManyByRangeQuery.mockResolvedValue([row('1')]);

			const { nextCursor } = await service.findPageWithCount(query({ range: { limit: 20 } }));

			expect(nextCursor).toBeNull();
		});

		it('derives the cursor from the completed page, not from current', async () => {
			executionRepository.findManyByRangeQuery.mockImplementation(async (q) =>
				q.status?.includes('running') ? [row('20', 'running')] : [row('10')],
			);

			const { nextCursor } = await service.findCurrentAndCompleted(
				completedPageQuery({ range: { limit: 1 } }),
			);

			expect(nextCursor).toBe(
				encodeExecutionCursor({
					version: 1,
					v1: { id: '10', timestamp: startedAt.toISOString() },
				}),
			);
		});
	});

	describe('findPageWithCount', () => {
		it('applies the cursor without mutating the caller query', async () => {
			const original = query({ range: { limit: 2 } });

			await service.findPageWithCount(original, {
				version: 1,
				v1: { id: '10', timestamp: startedAt.toISOString() },
			});

			expect(rangeQueries()[0].range.beforeId).toBe('10');
			expect(original.range.beforeId).toBeUndefined();
		});

		it('counts without the range bounds', async () => {
			await service.findPageWithCount(query());

			expect(executionRepository.fetchCount).toHaveBeenCalledWith(
				expect.not.objectContaining({ range: expect.anything() }),
			);
		});
	});

	describe('getExecutionsCountForQuery', () => {
		it('reports an exact count outside postgres', async () => {
			executionRepository.fetchCount.mockResolvedValue(12);

			expect(await service.getExecutionsCountForQuery(mock())).toEqual({
				count: 12,
				estimated: false,
			});
			expect(executionRepository.getLiveExecutionRowsOnPostgres).not.toHaveBeenCalled();
		});

		it('estimates from live rows on postgres when the table is large', async () => {
			databaseConfig.type = 'postgresdb';
			executionRepository.getLiveExecutionRowsOnPostgres.mockResolvedValue(200_000);

			expect(await service.getExecutionsCountForQuery(mock())).toEqual({
				count: 200_000,
				estimated: true,
			});
			expect(executionRepository.fetchCount).not.toHaveBeenCalled();
		});

		it('passes the unknown-count sentinel through', async () => {
			databaseConfig.type = 'postgresdb';
			executionRepository.getLiveExecutionRowsOnPostgres.mockResolvedValue(-1);

			expect(await service.getExecutionsCountForQuery(mock())).toEqual({
				count: -1,
				estimated: false,
			});
		});
	});
});
