import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig, WorkflowHistoryCompactionConfig } from '@n8n/config';
import type { DbConnection, WorkflowHistoryRepository } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';

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
		workflowHistory: {
			pruneTime: -1,
		},
	});

	beforeEach(() => {
		// Set the system to a time that isn't 3 AM to avoid hitting the "trim once a day" window
		const mockDate = new Date(2026, 10, 10, 1, 0, 0);
		vi.setSystemTime(mockDate);
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
			config,
			{ ...globalConfig, workflowHistory: { pruneTime: 24 } },
			mockLogger(),
			mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
			dbConnection,
			mock(),
			mock<EventService>(),
		);

		vi
			// @ts-expect-error Private method
			.spyOn(compactingService, 'compactHistories')
			.mockImplementation((() => {}) as never);

		const trimLongRunningHistoriesSpy = vi.spyOn(compactingService, 'trimLongRunningHistories');

		compactingService.runStartupCompaction();

		expect(compactingService.isTrimmingEnabled).toBe(false);
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

	it('should trim if triggered at 3 AM with trimOnStartUp as false', () => {
		const mockDate = new Date(2026, 10, 10, 3, 0, 0);
		vi.setSystemTime(mockDate);

		const compactingService = new WorkflowHistoryCompactionService(
			{ ...config, trimOnStartUp: false },
			globalConfig,
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

		expect(trimLongRunningHistoriesSpy).toHaveBeenCalled();

		vi.useRealTimers();
	});

	describe('compactHistories', () => {
		const createService = (workflowHistoryRepository: WorkflowHistoryRepository) => {
			const eventService = mock<EventService>();
			const compactingService = new WorkflowHistoryCompactionService(
				config,
				globalConfig,
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
				dbConnection,
				workflowHistoryRepository,
				eventService,
			);
			return { compactingService, eventService };
		};

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

	it('should not trim if triggered outside of 3 AM with trimOnStartUp as false', () => {
		const mockDate = new Date(2026, 10, 10, 5, 0, 0);
		vi.setSystemTime(mockDate);

		const compactingService = new WorkflowHistoryCompactionService(
			{ ...config, trimOnStartUp: false },
			globalConfig,
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

		expect(trimLongRunningHistoriesSpy).not.toHaveBeenCalled();

		vi.useRealTimers();
	});
});
