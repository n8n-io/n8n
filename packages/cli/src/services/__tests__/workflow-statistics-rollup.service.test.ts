import type { Logger } from '@n8n/backend-common';
import type { DatabaseConfig } from '@n8n/config';
import type { DbConnection, DbLockService, WorkflowStatisticsRepository } from '@n8n/db';
import { StatisticsNames } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { ErrorReporter, InstanceSettings } from 'n8n-core';
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
		const databaseConfig = mock<DatabaseConfig>({ type: opts.dbType ?? 'postgresdb' });
		const errorReporter = mock<ErrorReporter>();
		const dbLockService = mock<DbLockService>();
		const repository = mock<WorkflowStatisticsRepository>();
		const statisticsService = mock<WorkflowStatisticsService>();
		const logger = mock<Logger>(); // the scoped logger the service actually logs to
		const service = new WorkflowStatisticsRollupService(
			mock<Logger>({ scoped: vi.fn().mockReturnValue(logger) }),
			errorReporter,
			instanceSettings,
			dbConnection,
			databaseConfig,
			dbLockService,
			repository,
			statisticsService,
		);
		return { service, logger, errorReporter, dbLockService, repository, statisticsService };
	};

	/** Invoke the private rollup tick directly. */
	const rollup = async (service: WorkflowStatisticsRollupService) =>
		await (service as unknown as { rollup: () => Promise<number> }).rollup();

	describe('shouldRun', () => {
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
			const startSpy = vi.spyOn(service, 'start').mockImplementation(() => {});
			service.init();
			expect(startSpy).toHaveBeenCalled();
		});

		it('does not start on a follower', () => {
			const { service } = makeService({ isLeader: false });
			const startSpy = vi.spyOn(service, 'start').mockImplementation(() => {});
			service.init();
			expect(startSpy).not.toHaveBeenCalled();
		});

		it('does not run after shutdown', async () => {
			const { service } = makeService({ isLeader: true });
			expect(service.shouldRun).toBe(true);
			await service.shutdown();
			expect(service.shouldRun).toBe(false);
		});
	});

	describe('start', () => {
		const isRunning = (service: WorkflowStatisticsRollupService) =>
			(service as unknown as { timeout: NodeJS.Timeout | undefined }).timeout !== undefined;

		it('does not schedule on a takeover when it should not run', () => {
			const { service } = makeService({ dbType: 'sqlite' });
			service.start();
			expect(isRunning(service)).toBe(false);
		});
	});

	describe('lock contention', () => {
		const lockHeld = () => new OperationalError('lock held');

		it('warns with counts once skips reach the threshold', async () => {
			const { service, dbLockService, logger } = makeService({});
			dbLockService.tryWithLock.mockRejectedValue(lockHeld());

			for (let i = 0; i < 5; i++) await rollup(service);

			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(expect.any(String), {
				consecutiveLockSkips: 5,
				totalLockSkips: 5,
			});
		});

		it('resets the consecutive count on a successful fold but keeps the total', async () => {
			const { service, dbLockService, logger } = makeService({});
			const empty: RollupResult = { increments: 0, firstOccurrences: [] };

			for (let i = 0; i < 4; i++) dbLockService.tryWithLock.mockRejectedValueOnce(lockHeld());
			dbLockService.tryWithLock.mockResolvedValueOnce(empty);
			for (let i = 0; i < 5; i++) await rollup(service);
			expect(logger.warn).not.toHaveBeenCalled(); // streak broken at 4

			for (let i = 0; i < 5; i++) dbLockService.tryWithLock.mockRejectedValueOnce(lockHeld());
			for (let i = 0; i < 5; i++) await rollup(service);

			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(expect.any(String), {
				consecutiveLockSkips: 5,
				totalLockSkips: 9,
			});
		});
	});

	describe('shutdown', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('resolves immediately when no tick is in flight', async () => {
			const { service } = makeService({});
			await expect(service.shutdown()).resolves.toBeUndefined();
		});

		it('awaits the in-flight tick (fold and milestones) before resolving, then stops', async () => {
			const { service, dbLockService, statisticsService } = makeService({});
			let resolveFold!: (result: RollupResult) => void;
			dbLockService.tryWithLock.mockImplementation(
				async () => await new Promise<RollupResult>((resolve) => (resolveFold = resolve)),
			);
			statisticsService.emitFirstOccurrenceEvent.mockResolvedValue();

			service.start();
			await vi.advanceTimersByTimeAsync(0); // fire the first tick; fold now in flight

			let shutdownSettled = false;
			const shutdownPromise = service.shutdown().then(() => (shutdownSettled = true));
			await vi.advanceTimersByTimeAsync(0); // flush microtasks
			expect(shutdownSettled).toBe(false); // still awaiting the in-flight fold

			resolveFold({
				increments: 1,
				firstOccurrences: [
					{
						name: StatisticsNames.productionSuccess,
						workflowId: 'wf-1',
						workflowName: 'A',
						firstEventMs: 1,
					},
				],
			});
			await shutdownPromise;

			// The milestone was emitted before shutdown resolved.
			expect(statisticsService.emitFirstOccurrenceEvent).toHaveBeenCalledTimes(1);

			// No further tick is scheduled after shutdown.
			await vi.advanceTimersByTimeAsync(60_000);
			expect(dbLockService.tryWithLock).toHaveBeenCalledTimes(1);
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
