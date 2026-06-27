import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { DbConnection, DbLockService, WorkflowStatisticsRepository } from '@n8n/db';
import { StatisticsNames } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';

import type { WorkflowStatisticsService } from '../workflow-statistics.service';
import { WorkflowStatisticsRollupService } from '../workflow-statistics-rollup.service';

type RollupResult = Awaited<ReturnType<WorkflowStatisticsRepository['rollupIncrements']>>;

describe('WorkflowStatisticsRollupService', () => {
	const dbConnection = mock<DbConnection>({ connectionState: { migrated: true } });

	const makeService = (opts: {
		isLeader?: boolean;
		instanceType?: 'main' | 'worker';
		dbType?: 'postgresdb' | 'sqlite';
	}) => {
		const instanceSettings = mock<InstanceSettings>({
			isLeader: opts.isLeader ?? true,
			instanceType: opts.instanceType ?? 'main',
			instanceRole: 'leader',
		});
		const globalConfig = mock<GlobalConfig>({
			database: { type: opts.dbType ?? 'postgresdb' },
		});
		const dbLockService = mock<DbLockService>();
		const repository = mock<WorkflowStatisticsRepository>();
		const statisticsService = mock<WorkflowStatisticsService>();
		const service = new WorkflowStatisticsRollupService(
			mockLogger(),
			instanceSettings,
			dbConnection,
			globalConfig,
			dbLockService,
			repository,
			statisticsService,
		);
		return { service, dbLockService, repository, statisticsService };
	};

	/** Invoke the private rollup tick directly. */
	const rollup = async (service: WorkflowStatisticsRollupService) =>
		await (service as unknown as { rollup: () => Promise<number> }).rollup();

	describe('isEnabled', () => {
		it('is true for a leader main on Postgres', () => {
			const { service } = makeService({
				isLeader: true,
				instanceType: 'main',
				dbType: 'postgresdb',
			});
			expect(service.shouldRun).toBe(true);
		});

		it('is false on SQLite', () => {
			const { service } = makeService({ isLeader: true, instanceType: 'main', dbType: 'sqlite' });
			expect(service.shouldRun).toBe(false);
		});

		it('is false for a follower', () => {
			const { service } = makeService({ isLeader: false });
			expect(service.shouldRun).toBe(false);
		});

		it('is false for a non-main instance', () => {
			const { service } = makeService({ instanceType: 'worker' });
			expect(service.shouldRun).toBe(false);
		});
	});

	describe('init', () => {
		it('starts the rollup on a leader main (Postgres)', () => {
			const { service } = makeService({ isLeader: true });
			const startSpy = jest.spyOn(service, 'start').mockImplementation(() => {});
			service.init();
			expect(startSpy).toHaveBeenCalled();
		});

		it('does not start on a follower', () => {
			const { service } = makeService({ isLeader: false });
			const startSpy = jest.spyOn(service, 'start').mockImplementation(() => {});
			service.init();
			expect(startSpy).not.toHaveBeenCalled();
		});

		it('does not run after shutdown', () => {
			const { service } = makeService({ isLeader: true });
			expect(service.shouldRun).toBe(true);
			service.shutdown();
			expect(service.shouldRun).toBe(false);
		});
	});

	describe('rollup', () => {
		it('skips the tick (returns 0, no milestones) when the advisory lock is held by another instance', async () => {
			const { service, dbLockService, statisticsService } = makeService({});
			dbLockService.tryWithLock.mockRejectedValue(new OperationalError('lock held'));

			const folded = await rollup(service);

			expect(folded).toBe(0);
			expect(statisticsService.emitFirstOccurrenceEvent).not.toHaveBeenCalled();
		});

		it('rethrows a non-lock error so the scheduler logs and retries the tick', async () => {
			const { service, dbLockService, statisticsService } = makeService({});
			dbLockService.tryWithLock.mockRejectedValue(new Error('connection reset'));

			await expect(rollup(service)).rejects.toThrow('connection reset');
			expect(statisticsService.emitFirstOccurrenceEvent).not.toHaveBeenCalled();
		});

		it('fires a milestone for each first-occurrence row and returns the increment count', async () => {
			const { service, dbLockService, statisticsService } = makeService({});
			const result: RollupResult = {
				increments: 1234,
				firstOccurrences: [
					{
						name: StatisticsNames.productionSuccess,
						workflowId: 'wf-1',
						workflowName: 'A',
						firstEventMs: 1,
					},
					{
						name: StatisticsNames.productionError,
						workflowId: 'wf-2',
						workflowName: 'B',
						firstEventMs: 2,
					},
				],
			};
			dbLockService.tryWithLock.mockResolvedValue(result);

			const folded = await rollup(service);

			expect(folded).toBe(1234);
			expect(statisticsService.emitFirstOccurrenceEvent).toHaveBeenCalledTimes(2);
			expect(statisticsService.emitFirstOccurrenceEvent).toHaveBeenCalledWith(
				StatisticsNames.productionSuccess,
				'wf-1',
				'A',
				1,
			);
		});

		it('isolates milestone failures: one throwing row does not stop the others or fail the tick', async () => {
			const { service, dbLockService, statisticsService } = makeService({});
			const result: RollupResult = {
				increments: 2,
				firstOccurrences: [
					{
						name: StatisticsNames.productionSuccess,
						workflowId: 'deleted-wf',
						workflowName: null,
						firstEventMs: 1,
					},
					{
						name: StatisticsNames.productionSuccess,
						workflowId: 'wf-2',
						workflowName: 'B',
						firstEventMs: 2,
					},
				],
			};
			dbLockService.tryWithLock.mockResolvedValue(result);
			statisticsService.emitFirstOccurrenceEvent
				.mockRejectedValueOnce(new Error('workflow/project deleted during rollup lag'))
				.mockResolvedValueOnce();

			// Must not throw, and must still return the folded count.
			await expect(rollup(service)).resolves.toBe(2);
			expect(statisticsService.emitFirstOccurrenceEvent).toHaveBeenCalledTimes(2);
		});
	});
});
