import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig, WorkflowHistoryCompactionConfig } from '@n8n/config';
import type { DbConnection } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

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
	});
	const globalConfig = mock<GlobalConfig>({
		workflowHistory: {
			pruneTime: -1,
		},
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
			);
			const startCompacting = jest.spyOn(compactingService, 'startCompacting');

			compactingService.init();

			expect(startCompacting).toHaveBeenCalled();
		});

		it('should not start pruning on main instance that is a follower', () => {
			const compactingService = new WorkflowHistoryCompactionService(
				config,
				globalConfig,
				mockLogger(),
				mock<InstanceSettings>({ isLeader: false, isMultiMain: true }),
				dbConnection,
				mock(),
			);
			const startCompacting = jest.spyOn(compactingService, 'startCompacting');

			compactingService.init();

			expect(startCompacting).not.toHaveBeenCalled();
		});
	});

	describe('startCompacting', () => {
		it('should start compacting if service is enabled and DB is migrated', () => {
			const compactingService = new WorkflowHistoryCompactionService(
				config,
				globalConfig,
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
				dbConnection,
				mock(),
			);

			const scheduleOptimizationSpy = jest
				// @ts-expect-error Private method
				.spyOn(compactingService, 'scheduleOptimization')
				.mockImplementation();

			const scheduleTrimmingSpy = jest
				// @ts-expect-error Private method
				.spyOn(compactingService, 'scheduleTrimming')
				.mockImplementation();

			compactingService.startCompacting();

			expect(scheduleOptimizationSpy).toHaveBeenCalled();
			expect(scheduleTrimmingSpy).toHaveBeenCalled();
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
		);

		jest
			// @ts-expect-error Private method
			.spyOn(compactingService, 'compactHistories')
			.mockImplementation();

		const trimLongRunningHistoriesSpy = jest
			// @ts-expect-error Private method
			.spyOn(compactingService, 'trimLongRunningHistories');

		compactingService.startCompacting();

		expect(compactingService['trimmingInterval']).toBe(undefined);
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
		);

		jest
			// @ts-expect-error Private method
			.spyOn(compactingService, 'optimizeHistories')
			.mockImplementation();
		const trimLongRunningHistoriesSpy = jest
			// @ts-expect-error Private method
			.spyOn(compactingService, 'trimLongRunningHistories')
			.mockImplementation();

		compactingService.startCompacting();

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
		);

		const optimizeHistoriesSpy = jest
			// @ts-expect-error Private method
			.spyOn(compactingService, 'optimizeHistories')
			.mockImplementation();
		const trimLongRunningHistoriesSpy = jest
			// @ts-expect-error Private method
			.spyOn(compactingService, 'trimLongRunningHistories')
			.mockImplementation();

		compactingService.startCompacting();

		expect(optimizeHistoriesSpy).toHaveBeenCalled();
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
		);

		const optimizeHistoriesSpy = jest
			// @ts-expect-error Private method
			.spyOn(compactingService, 'optimizeHistories')
			.mockImplementation();
		const trimLongRunningHistoriesSpy = jest
			// @ts-expect-error Private method
			.spyOn(compactingService, 'trimLongRunningHistories')
			.mockImplementation();

		compactingService.startCompacting();

		expect(trimLongRunningHistoriesSpy).toHaveBeenCalled();
		// should still call recent history compaction
		expect(optimizeHistoriesSpy).toHaveBeenCalled();
	});
});
