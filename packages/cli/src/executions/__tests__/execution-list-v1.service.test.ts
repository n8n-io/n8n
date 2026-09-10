import type { DatabaseConfig } from '@n8n/config';
import type { ExecutionRepository } from '@n8n/db';
import type { ExecutionSummary } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { encodeExecutionCursor } from '@/executions/execution-cursor';
import { COMPLETED_STATUSES, ExecutionListV1Service } from '@/executions/execution-list-v1.service';

describe('ExecutionListV1Service', () => {
	const databaseConfig = mock<DatabaseConfig>({ type: 'sqlite' });
	const executionRepository = mock<ExecutionRepository>();

	const service = new ExecutionListV1Service(databaseConfig, executionRepository);

	beforeEach(() => {
		vi.clearAllMocks();
		executionRepository.getLiveExecutionRowsOnPostgres.mockResolvedValue(-1);
		executionRepository.fetchCount.mockResolvedValue(0);
	});

	describe('nextCursor', () => {
		it('findPageWithCount returns a cursor for the last row when the page is full', async () => {
			executionRepository.findManyByRangeQuery.mockResolvedValue([
				mock<ExecutionSummary>({ id: '2' }),
				mock<ExecutionSummary>({ id: '1' }),
			]);

			const { nextCursor } = await service.findPageWithCount(mock({ range: { limit: 2 } }));

			expect(nextCursor).toBe(encodeExecutionCursor('1'));
		});

		it('findPageWithCount returns null when the page is partial', async () => {
			executionRepository.findManyByRangeQuery.mockResolvedValue([
				mock<ExecutionSummary>({ id: '1' }),
			]);

			const { nextCursor } = await service.findPageWithCount(mock({ range: { limit: 20 } }));

			expect(nextCursor).toBeNull();
		});

		it('findCurrentAndCompleted derives the cursor from the completed page, not current', async () => {
			executionRepository.findManyByRangeQuery.mockImplementation(async (query) =>
				query.status?.includes('running')
					? [mock<ExecutionSummary>({ id: '20' })]
					: [mock<ExecutionSummary>({ id: '10' })],
			);

			const { nextCursor } = await service.findCurrentAndCompleted({
				kind: 'range',
				status: COMPLETED_STATUSES,
				range: { limit: 1 },
			});

			expect(nextCursor).toBe(encodeExecutionCursor('10'));
		});

		it('findCurrentAndCompleted applies the cursor to completed rows only', async () => {
			executionRepository.findManyByRangeQuery.mockResolvedValue([]);

			await service.findCurrentAndCompleted({
				kind: 'range',
				status: COMPLETED_STATUSES,
				range: { limit: 20, beforeId: '10' },
			});

			const queries = executionRepository.findManyByRangeQuery.mock.calls.map(([query]) => query);
			const current = queries.find((query) => query.status?.includes('running'));
			const completed = queries.find((query) => !query.status?.includes('running'));

			expect(current?.range).not.toHaveProperty('beforeId');
			expect(completed?.range.beforeId).toBe('10');
		});
	});

	describe('getExecutionsCountForQuery', () => {
		it('returns an exact count outside postgres', async () => {
			executionRepository.fetchCount.mockResolvedValue(7);

			const result = await service.getExecutionsCountForQuery(mock({ kind: 'count' }));

			expect(result).toEqual({ count: 7, estimated: false });
			expect(executionRepository.getLiveExecutionRowsOnPostgres).not.toHaveBeenCalled();
		});

		it('estimates from live rows on postgres when the table is large', async () => {
			databaseConfig.type = 'postgresdb';
			executionRepository.getLiveExecutionRowsOnPostgres.mockResolvedValue(200_000);

			const result = await service.getExecutionsCountForQuery(mock({ kind: 'count' }));

			expect(result).toEqual({ count: 200_000, estimated: true });
			expect(executionRepository.fetchCount).not.toHaveBeenCalled();

			databaseConfig.type = 'sqlite';
		});
	});
});
