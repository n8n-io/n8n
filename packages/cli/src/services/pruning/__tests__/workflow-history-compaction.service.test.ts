import type { EventService } from '@n8n/backend-services';
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig, WorkflowHistoryCompactionConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { DbConnection, WorkflowHistoryRepository } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { WorkflowHistoryCompactionService } from '../workflow-history-compaction.service';

describe('WorkflowHistoryCompactionService', () => {
	const dbConnection = mock<DbConnection>({
		connectionState: { migrated: true },
	});
	const config = mock<WorkflowHistoryCompactionConfig>({
		batchDelayMs: 1000,
		batchSize: 1000,
		optimizingMinimumAgeHours: 24,
		optimizingTimeWindowHours: 2,
		trimmingMinimumAgeDays: 7,
		trimmingTimeWindowDays: 2,
		trimOnStartUp: false,
		skipOnStartUp: false,
	});
	const globalConfig = mock<GlobalConfig>({
		generic: { timezone: 'Europe/Berlin' },
		workflowHistory: {
			pruneTime: -1,
		},
	});

	beforeEach(() => {
		// The window tests compare exact dates derived from `Date.now()`.
		vi.setSystemTime(new Date(2026, 10, 10, 1, 0, 0));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('init', () => {
		it('should start compacting on main instance that is the leader', () => {
			const compactingService = new WorkflowHistoryCompactionService(
				config,
				globalConfig,
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, isMultiMain: true }),
				dbConnection,
				mock(),
				mock<EventService>(),
			);
			const runStartupCompaction = vi.spyOn(compactingService, 'runStartupCompaction');

			compactingService.init();

			expect(runStartupCompaction).toHaveBeenCalled();
		});

		it('should not start pruning on main instance that is a follower', () => {
			const compactingService = new WorkflowHistoryCompactionService(
				config,
				globalConfig,
				mockLogger(),
				mock<InstanceSettings>({ isLeader: false, isMultiMain: true }),
				dbConnection,
				mock(),
				mock<EventService>(),
			);
			const runStartupCompaction = vi.spyOn(compactingService, 'runStartupCompaction');

			compactingService.init();

			expect(runStartupCompaction).not.toHaveBeenCalled();
		});
	});

	it('should skip trimming if pruneTime < trimAge', () => {
		const compactingService = new WorkflowHistoryCompactionService(
			{ ...config, trimOnStartUp: true },
			{ ...globalConfig, workflowHistory: { pruneTime: 24 } },
			mockLogger(),
			mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
			dbConnection,
			mock(),
			mock<EventService>(),
		);

		vi.spyOn(compactingService, 'compactHistories').mockImplementation((() => {}) as never);

		const trimLongRunningHistoriesSpy = vi.spyOn(compactingService, 'trimLongRunningHistories');

		compactingService.runStartupCompaction();

		expect(trimLongRunningHistoriesSpy).not.toBeCalled();
	});
	it('should not skip trimming if pruneTime > trimAge', () => {
		const compactingService = new WorkflowHistoryCompactionService(
			{ ...config, trimOnStartUp: true },
			{ ...globalConfig, workflowHistory: { pruneTime: 8 * 24 } },
			mockLogger(),
			mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
			dbConnection,
			mock(),
			mock<EventService>(),
		);

		vi.spyOn(compactingService, 'optimizeHistories').mockImplementation((() => {}) as never);
		const trimLongRunningHistoriesSpy = vi
			.spyOn(compactingService, 'trimLongRunningHistories')
			.mockImplementation((() => {}) as never);

		compactingService.runStartupCompaction();

		expect(trimLongRunningHistoriesSpy).toBeCalled();
	});

	it('should compact on start up ', () => {
		const compactingService = new WorkflowHistoryCompactionService(
			config,
			globalConfig,
			mockLogger(),
			mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
			dbConnection,
			mock(),
			mock<EventService>(),
		);

		const optimizeHistoriesSpy = vi
			.spyOn(compactingService, 'optimizeHistories')
			.mockImplementation((() => {}) as never);
		const trimLongRunningHistoriesSpy = vi
			.spyOn(compactingService, 'trimLongRunningHistories')
			.mockImplementation((() => {}) as never);

		compactingService.runStartupCompaction();

		expect(optimizeHistoriesSpy).toHaveBeenCalled();
		expect(trimLongRunningHistoriesSpy).not.toHaveBeenCalled();
	});

	it('should not compact on start up if skipOnStartUp is set', () => {
		const compactingService = new WorkflowHistoryCompactionService(
			{ ...config, skipOnStartUp: true, trimOnStartUp: true },
			globalConfig,
			mockLogger(),
			mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
			dbConnection,
			mock(),
			mock<EventService>(),
		);

		const optimizeHistoriesSpy = vi
			.spyOn(compactingService, 'optimizeHistories')
			.mockImplementation((() => {}) as never);
		const trimLongRunningHistoriesSpy = vi
			.spyOn(compactingService, 'trimLongRunningHistories')
			.mockImplementation((() => {}) as never);

		compactingService.runStartupCompaction();

		expect(optimizeHistoriesSpy).not.toHaveBeenCalled();
		expect(trimLongRunningHistoriesSpy).not.toHaveBeenCalled();
	});

	it('should trim on start up if flag is provided', () => {
		const compactingService = new WorkflowHistoryCompactionService(
			{ ...config, trimOnStartUp: true },
			globalConfig,
			mockLogger(),
			mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
			dbConnection,
			mock(),
			mock<EventService>(),
		);

		const optimizeHistoriesSpy = vi
			.spyOn(compactingService, 'optimizeHistories')
			.mockImplementation((() => {}) as never);
		const trimLongRunningHistoriesSpy = vi
			.spyOn(compactingService, 'trimLongRunningHistories')
			.mockImplementation((() => {}) as never);

		compactingService.runStartupCompaction();

		expect(trimLongRunningHistoriesSpy).toHaveBeenCalled();
		// should still call recent history compaction
		expect(optimizeHistoriesSpy).toHaveBeenCalled();
	});

	describe('compactHistories', () => {
		const createService = (
			workflowHistoryRepository: WorkflowHistoryRepository,
			isLeader = true,
		) => {
			const eventService = mock<EventService>();
			const compactingService = new WorkflowHistoryCompactionService(
				config,
				globalConfig,
				mockLogger(),
				mock<InstanceSettings>({ isLeader, instanceType: 'main', isMultiMain: true }),
				dbConnection,
				workflowHistoryRepository,
				eventService,
			);
			return { compactingService, eventService };
		};

		it('should optimize over the window between optimizingMinimumAge and the time window', async () => {
			const workflowHistoryRepository = mock<WorkflowHistoryRepository>();
			workflowHistoryRepository.getWorkflowIdsInRange.mockResolvedValue([]);
			const { compactingService } = createService(workflowHistoryRepository);

			await compactingService['optimizeHistories'](new AbortController().signal);

			const now = Date.now();
			expect(workflowHistoryRepository.getWorkflowIdsInRange).toHaveBeenCalledWith(
				new Date(now - 26 * Time.hours.toMilliseconds),
				new Date(now - 24 * Time.hours.toMilliseconds),
			);
		});

		it('should optimize on a main that is not the leader', async () => {
			const workflowHistoryRepository = mock<WorkflowHistoryRepository>();
			workflowHistoryRepository.getWorkflowIdsInRange.mockResolvedValue(['wf-1']);
			workflowHistoryRepository.pruneHistory.mockResolvedValue({ seen: 2, deleted: 1 });
			const { compactingService } = createService(workflowHistoryRepository, false);

			await compactingService.optimizeHistories(new AbortController().signal);

			expect(workflowHistoryRepository.pruneHistory).toHaveBeenCalledOnce();
		});

		it('should trim over the window between trimmingMinimumAge and the time window, anchored to the start of the day in the instance timezone', async () => {
			// 03:00 UTC on 10 November is 04:00 in Berlin, whose day started at 23:00 UTC the day before.
			vi.setSystemTime(new Date('2026-11-10T03:00:00.000Z'));
			const startOfDay = new Date('2026-11-09T23:00:00.000Z');
			const workflowHistoryRepository = mock<WorkflowHistoryRepository>();
			workflowHistoryRepository.getWorkflowIdsInRange.mockResolvedValue([]);
			const { compactingService } = createService(workflowHistoryRepository);

			await compactingService['trimLongRunningHistories'](new AbortController().signal);

			expect(workflowHistoryRepository.getWorkflowIdsInRange).toHaveBeenCalledWith(
				new Date(startOfDay.getTime() - 9 * Time.days.toMilliseconds),
				new Date(startOfDay.getTime() - 7 * Time.days.toMilliseconds),
			);
		});

		it('should read the same trim window for every pass of one day', async () => {
			const workflowHistoryRepository = mock<WorkflowHistoryRepository>();
			workflowHistoryRepository.getWorkflowIdsInRange.mockResolvedValue([]);
			const { compactingService } = createService(workflowHistoryRepository);

			vi.setSystemTime(new Date('2026-11-10T03:00:00.000Z'));
			await compactingService['trimLongRunningHistories'](new AbortController().signal);
			vi.setSystemTime(new Date('2026-11-10T22:59:59.999Z'));
			await compactingService['trimLongRunningHistories'](new AbortController().signal);

			const [first, second] = workflowHistoryRepository.getWorkflowIdsInRange.mock.calls;
			expect(second).toEqual(first);
		});

		it('should move the trim window by one day at midnight in the instance timezone', async () => {
			const workflowHistoryRepository = mock<WorkflowHistoryRepository>();
			workflowHistoryRepository.getWorkflowIdsInRange.mockResolvedValue([]);
			const { compactingService } = createService(workflowHistoryRepository);

			vi.setSystemTime(new Date('2026-11-10T22:59:59.999Z'));
			await compactingService['trimLongRunningHistories'](new AbortController().signal);
			vi.setSystemTime(new Date('2026-11-10T23:00:00.000Z'));
			await compactingService['trimLongRunningHistories'](new AbortController().signal);

			const [[firstStart, firstEnd], [secondStart, secondEnd]] =
				workflowHistoryRepository.getWorkflowIdsInRange.mock.calls;
			expect(secondStart.getTime() - firstStart.getTime()).toBe(Time.days.toMilliseconds);
			expect(secondEnd.getTime() - firstEnd.getTime()).toBe(Time.days.toMilliseconds);
		});

		it.each([
			// The day in Berlin starts an hour before UTC in winter, two hours in summer.
			['Europe/Berlin', '2026-11-10T03:00:00.000Z', '2026-11-09T23:00:00.000Z'],
			['Europe/Berlin', '2026-07-10T03:00:00.000Z', '2026-07-09T22:00:00.000Z'],
			// At 03:00 UTC it is still the day before in New York.
			['America/New_York', '2026-11-10T03:00:00.000Z', '2026-11-09T05:00:00.000Z'],
			['UTC', '2026-11-10T03:00:00.000Z', '2026-11-10T00:00:00.000Z'],
			// 25 October 2026 has 25 hours in Berlin; the day still starts at its own midnight.
			['Europe/Berlin', '2026-10-25T03:00:00.000Z', '2026-10-24T22:00:00.000Z'],
		])(
			'should anchor the trim window to the start of the day in %s',
			async (timezone, now, startOfDay) => {
				vi.setSystemTime(new Date(now));
				const workflowHistoryRepository = mock<WorkflowHistoryRepository>();
				workflowHistoryRepository.getWorkflowIdsInRange.mockResolvedValue([]);
				const compactingService = new WorkflowHistoryCompactionService(
					config,
					mock<GlobalConfig>({ generic: { timezone }, workflowHistory: { pruneTime: -1 } }),
					mockLogger(),
					mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
					dbConnection,
					workflowHistoryRepository,
					mock<EventService>(),
				);

				await compactingService['trimLongRunningHistories'](new AbortController().signal);

				const anchorMs = new Date(startOfDay).getTime();
				expect(workflowHistoryRepository.getWorkflowIdsInRange).toHaveBeenCalledWith(
					new Date(anchorMs - 9 * Time.days.toMilliseconds),
					new Date(anchorMs - 7 * Time.days.toMilliseconds),
				);
			},
		);

		it('should keep the optimize window on the clock while the trim window is anchored', async () => {
			vi.setSystemTime(new Date('2026-11-10T03:00:00.000Z'));
			const workflowHistoryRepository = mock<WorkflowHistoryRepository>();
			workflowHistoryRepository.getWorkflowIdsInRange.mockResolvedValue([]);
			const { compactingService } = createService(workflowHistoryRepository);

			await compactingService['optimizeHistories'](new AbortController().signal);
			await compactingService['trimLongRunningHistories'](new AbortController().signal);

			const [[, optimizeEnd], [, trimEnd]] =
				workflowHistoryRepository.getWorkflowIdsInRange.mock.calls;
			expect(optimizeEnd).toEqual(new Date('2026-11-09T03:00:00.000Z'));
			expect(trimEnd).toEqual(new Date('2026-11-02T23:00:00.000Z'));
		});

		it('should not emit telemetry when no workflows are in range', async () => {
			const workflowHistoryRepository = mock<WorkflowHistoryRepository>();
			workflowHistoryRepository.getWorkflowIdsInRange.mockResolvedValue([]);
			const { compactingService, eventService } = createService(workflowHistoryRepository);

			await compactingService['optimizeHistories'](new AbortController().signal);

			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('should emit telemetry when workflows are in range', async () => {
			const workflowHistoryRepository = mock<WorkflowHistoryRepository>();
			workflowHistoryRepository.getWorkflowIdsInRange.mockResolvedValue(['workflow-id']);
			workflowHistoryRepository.pruneHistory.mockResolvedValue({ seen: 5, deleted: 2 });
			const { compactingService, eventService } = createService(workflowHistoryRepository);

			await compactingService['optimizeHistories'](new AbortController().signal);

			expect(eventService.emit).toHaveBeenCalledWith(
				'history-compacted',
				expect.objectContaining({
					workflowsProcessed: 1,
					totalVersionsSeen: 5,
					totalVersionsDeleted: 2,
					errorCount: 0,
				}),
			);
		});
	});

	describe('abort handling', () => {
		// A batch delay long enough that a pass which ignores the abort would hang
		// the test instead of finishing.
		const abortConfig = { ...config, batchSize: 1, batchDelayMs: 60_000 };

		const setupService = (workflowIds: string[]) => {
			const workflowHistoryRepository = mock<WorkflowHistoryRepository>();
			workflowHistoryRepository.getWorkflowIdsInRange.mockResolvedValue(workflowIds);

			const eventService = mock<EventService>();
			const compactingService = new WorkflowHistoryCompactionService(
				abortConfig,
				globalConfig,
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
				dbConnection,
				workflowHistoryRepository,
				eventService,
			);

			return { compactingService, workflowHistoryRepository, eventService };
		};

		it('should stop optimizing at the next workflow once the signal aborts', async () => {
			const { compactingService, workflowHistoryRepository, eventService } = setupService([
				'wf1',
				'wf2',
				'wf3',
			]);
			const abort = new AbortController();
			workflowHistoryRepository.pruneHistory.mockImplementation(async () => {
				abort.abort();
				return { seen: 5, deleted: 1 };
			});

			await compactingService.optimizeHistories(abort.signal);

			expect(workflowHistoryRepository.pruneHistory).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith(
				'history-compacted',
				expect.objectContaining({ workflowsProcessed: 1, totalVersionsDeleted: 1 }),
			);
		});

		it('should stop trimming at the next workflow once the signal aborts', async () => {
			const { compactingService, workflowHistoryRepository } = setupService(['wf1', 'wf2']);
			const abort = new AbortController();
			workflowHistoryRepository.pruneHistory.mockImplementation(async () => {
				abort.abort();
				return { seen: 5, deleted: 0 };
			});

			await compactingService.trimLongRunningHistories(abort.signal);

			expect(workflowHistoryRepository.pruneHistory).toHaveBeenCalledTimes(1);
		});

		it('should run every workflow when the signal never aborts', async () => {
			const { compactingService, workflowHistoryRepository, eventService } = setupService([
				'wf1',
				'wf2',
			]);
			// `seen` below `batchSize` keeps the pass off the batch delay.
			workflowHistoryRepository.pruneHistory.mockResolvedValue({ seen: 0, deleted: 0 });

			await compactingService.optimizeHistories(new AbortController().signal);

			expect(workflowHistoryRepository.pruneHistory).toHaveBeenCalledTimes(2);
			expect(eventService.emit).toHaveBeenCalledWith(
				'history-compacted',
				expect.objectContaining({ workflowsProcessed: 2 }),
			);
		});

		it('should hand a detached startup pass a signal that stepdown aborts', () => {
			const { compactingService } = setupService([]);
			const optimizeHistories = vi
				.spyOn(compactingService, 'optimizeHistories')
				.mockResolvedValue(undefined);

			compactingService.runStartupCompaction();

			const signal = optimizeHistories.mock.calls[0][0];
			expect(signal.aborted).toBe(false);

			compactingService.stopStartupCompaction();

			expect(signal.aborted).toBe(true);
		});
	});
});
