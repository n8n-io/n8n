import { mockLogger } from '@n8n/backend-test-utils';
import type { WorkflowHistoryCompactionConfig } from '@n8n/config';
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
		compactingMinimumAgeHours: 24,
		compactingTimeWindowHours: 2,
		compactOnStartUp: false,
	});

	describe('init', () => {
		it('should start compacting on main instance that is the leader', () => {
			const compactingService = new WorkflowHistoryCompactionService(
				config,
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
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
				dbConnection,
				mock(),
			);

			const scheduleRollingCompactingSpy = jest
				// @ts-expect-error Private method
				.spyOn(compactingService, 'scheduleRollingCompacting')
				.mockImplementation();

			compactingService.startCompacting();

			expect(scheduleRollingCompactingSpy).toHaveBeenCalled();
		});
	});

	it('should compact on start up if config says so', () => {
		const compactingService = new WorkflowHistoryCompactionService(
			{ ...config, compactOnStartUp: true },
			mockLogger(),
			mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
			dbConnection,
			mock(),
		);

		const scheduleRollingCompactingSpy = jest
			// @ts-expect-error Private method
			.spyOn(compactingService, 'compactHistories')
			.mockImplementation();

		compactingService.startCompacting();

		expect(scheduleRollingCompactingSpy).toHaveBeenCalled();
	});
});
