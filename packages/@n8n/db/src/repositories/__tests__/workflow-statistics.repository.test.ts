import type { GlobalConfig } from '@n8n/config';
import { In, type DataSource } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { WorkflowStatistics } from '../../entities';
import { StatisticsNames } from '../../entities/types-db';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { WorkflowStatisticsRepository } from '../workflow-statistics.repository';

describe('WorkflowStatisticsRepository', () => {
	const entityManager = mockEntityManager(WorkflowStatistics);
	const repository = new WorkflowStatisticsRepository(
		entityManager.connection as unknown as DataSource,
		mock<GlobalConfig>({ database: { type: 'postgresdb', tablePrefix: '' } }),
	);

	beforeEach(() => {
		vi.resetAllMocks();
		Object.assign(entityManager.connection.driver, {
			escape: vi.fn((identifier: string) => `"${identifier}"`),
		});
	});

	it.each([
		['a Date', new Date('2026-07-21T16:33:00.000Z')],
		// Regression for #34669: raw Postgres timestamps are not always parsed into Date objects.
		['an ISO timestamp string', '2026-07-21T16:33:00.000Z'],
	])('converts firstEvent from %s to epoch milliseconds', async (_, firstEvent) => {
		entityManager.query.mockResolvedValueOnce([
			{
				delta_rows: 1,
				workflowId: 'workflow-id',
				name: StatisticsNames.productionSuccess,
				inserted: true,
				workflowName: 'Workflow',
				firstEvent,
			},
		]);

		const result = await repository.rollupIncrements(entityManager, 100);

		expect(result).toEqual({
			increments: 1,
			firstOccurrences: [
				{
					name: StatisticsNames.productionSuccess,
					workflowId: 'workflow-id',
					workflowName: 'Workflow',
					firstEventMs: 1_784_651_580_000,
				},
			],
		});
	});

	describe('findByWorkflowIds', () => {
		it('returns no rows and runs no query for an empty id list', async () => {
			expect(await repository.findByWorkflowIds([])).toEqual([]);

			expect(entityManager.find).not.toHaveBeenCalled();
		});

		it('loads the rows of the given workflows', async () => {
			const row = { workflowId: 'wf-1', count: 3 } as WorkflowStatistics;
			entityManager.find.mockResolvedValueOnce([row]);

			const rows = await repository.findByWorkflowIds(['wf-1', 'wf-2']);

			expect(rows).toEqual([row]);
			expect(entityManager.find).toHaveBeenCalledWith(WorkflowStatistics, {
				where: { workflowId: In(['wf-1', 'wf-2']) },
			});
		});
	});
});
