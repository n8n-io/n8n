import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionsConfig } from '@n8n/config';
import type { DbConnection } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { ExecutionsPruningService } from '../executions-pruning.service';

describe('PruningService', () => {
	const dbConnection = mock<DbConnection>({
		connectionState: { migrated: true },
	});

	describe('init', () => {
		it('should start pruning on main instance that is the leader', () => {
			const pruningService = new ExecutionsPruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, isMultiMain: true }),
				dbConnection,
				mock(),
				mock(),
				mock(),
			);
			const startPruningSpy = vi.spyOn(pruningService, 'startPruning');

			pruningService.init();

			expect(startPruningSpy).toHaveBeenCalled();
		});

		it('should not start pruning on main instance that is a follower', () => {
			const pruningService = new ExecutionsPruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: false, isMultiMain: true }),
				dbConnection,
				mock(),
				mock(),
				mock(),
			);
			const startPruningSpy = vi.spyOn(pruningService, 'startPruning');

			pruningService.init();

			expect(startPruningSpy).not.toHaveBeenCalled();
		});
	});

	describe('isEnabled', () => {
		it('should return `true` based on config if leader main', () => {
			const pruningService = new ExecutionsPruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
				dbConnection,
				mock(),
				mock(),
				mock<ExecutionsConfig>({ pruneData: true }),
			);

			expect(pruningService.isEnabled).toBe(true);
		});

		it('should return `false` based on config if leader main', () => {
			const pruningService = new ExecutionsPruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
				dbConnection,
				mock(),
				mock(),
				mock<ExecutionsConfig>({ pruneData: false }),
			);

			expect(pruningService.isEnabled).toBe(false);
		});

		it('should return `false` if non-main even if config is enabled', () => {
			const pruningService = new ExecutionsPruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: false, instanceType: 'worker', isMultiMain: true }),
				dbConnection,
				mock(),
				mock(),
				mock<ExecutionsConfig>({ pruneData: true }),
			);

			expect(pruningService.isEnabled).toBe(false);
		});

		it('should return `false` if follower main even if config is enabled', () => {
			const pruningService = new ExecutionsPruningService(
				mockLogger(),
				mock<InstanceSettings>({
					isLeader: false,
					isFollower: true,
					instanceType: 'main',
					isMultiMain: true,
				}),
				dbConnection,
				mock(),
				mock(),
				mock<ExecutionsConfig>({ pruneData: true }),
			);

			expect(pruningService.isEnabled).toBe(false);
		});
	});

	describe('startPruning', () => {
		it('should not start pruning if service is disabled', () => {
			const pruningService = new ExecutionsPruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
				dbConnection,
				mock(),
				mock(),
				mock<ExecutionsConfig>({ pruneData: false }),
			);

			// @ts-expect-error Private method
			const scheduleNextHardDeletionSpy = vi.spyOn(pruningService, 'scheduleNextHardDeletion');

			pruningService.startPruning();

			expect(scheduleNextHardDeletionSpy).not.toHaveBeenCalled();
		});

		it('should start pruning if service is enabled and DB is migrated', () => {
			const pruningService = new ExecutionsPruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
				dbConnection,
				mock(),
				mock(),
				mock<ExecutionsConfig>({ pruneData: true }),
			);

			const scheduleNextHardDeletionSpy = vi
				// @ts-expect-error Private method
				.spyOn(pruningService, 'scheduleNextHardDeletion')
				.mockImplementation((() => {}) as never);

			pruningService.startPruning();

			expect(scheduleNextHardDeletionSpy).toHaveBeenCalled();
		});
	});

	describe('stopPruning', () => {
		afterEach(() => vi.restoreAllMocks());

		it('should stop pruning when instance loses leadership', () => {
			// arrange

			const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

			let isLeader = true;
			const instanceSettings = mock<InstanceSettings>({
				instanceType: 'main',
				isMultiMain: true,
			});
			Object.defineProperty(instanceSettings, 'isLeader', { get: () => isLeader });
			instanceSettings.markAsFollower.mockImplementation(() => {
				isLeader = false;
			});

			const pruningService = new ExecutionsPruningService(
				mockLogger(),
				instanceSettings,
				dbConnection,
				mock(),
				mock(),
				mock<ExecutionsConfig>({
					pruneData: true,
					pruneDataIntervals: { softDelete: 60, hardDelete: 15 },
				}),
			);

			pruningService.startPruning();

			// act

			instanceSettings.markAsFollower();
			pruningService.stopPruning();

			// assert

			expect(isLeader).toBe(false);
			expect(clearTimeoutSpy).toHaveBeenCalled();
		});
	});
});
