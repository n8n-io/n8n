import type { ExecutionsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { mockLogger } from '@test/mocking';

import { PruningService } from '../pruning.service';

jest.mock('@/db', () => ({
	connectionState: { migrated: true },
}));

describe('PruningService', () => {
	describe('init', () => {
		it('should start pruning on main instance that is the leader', () => {
			const pruningService = new PruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, isMultiMain: true }),
				mock(),
				mock(),
				mock(),
			);
			const startPruningSpy = jest.spyOn(pruningService, 'startPruning');

			pruningService.init();

			expect(startPruningSpy).toHaveBeenCalled();
		});

		it('should not start pruning on main instance that is a follower', () => {
			const pruningService = new PruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: false, isMultiMain: true }),
				mock(),
				mock(),
				mock(),
			);
			const startPruningSpy = jest.spyOn(pruningService, 'startPruning');

			pruningService.init();

			expect(startPruningSpy).not.toHaveBeenCalled();
		});
	});

	describe('isEnabled', () => {
		it('should return `true` based on config if leader main', () => {
			const pruningService = new PruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
				mock(),
				mock(),
				mock<ExecutionsConfig>({ pruneData: true }),
			);

			expect(pruningService.isEnabled).toBe(true);
		});

		it('should return `false` based on config if leader main', () => {
			const pruningService = new PruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
				mock(),
				mock(),
				mock<ExecutionsConfig>({ pruneData: false }),
			);

			expect(pruningService.isEnabled).toBe(false);
		});

		it('should return `false` if non-main even if config is enabled', () => {
			const pruningService = new PruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: false, instanceType: 'worker', isMultiMain: true }),
				mock(),
				mock(),
				mock<ExecutionsConfig>({ pruneData: true }),
			);

			expect(pruningService.isEnabled).toBe(false);
		});

		it('should return `false` if follower main even if config is enabled', () => {
			const pruningService = new PruningService(
				mockLogger(),
				mock<InstanceSettings>({
					isLeader: false,
					isFollower: true,
					instanceType: 'main',
					isMultiMain: true,
				}),
				mock(),
				mock(),
				mock<ExecutionsConfig>({ pruneData: true }),
			);

			expect(pruningService.isEnabled).toBe(false);
		});
	});

	describe('startPruning', () => {
		it('should not start pruning if service is disabled', () => {
			const pruningService = new PruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
				mock(),
				mock(),
				mock<ExecutionsConfig>({ pruneData: false }),
			);

			const scheduleRollingSoftDeletionsSpy = jest.spyOn(
				pruningService,
				// @ts-expect-error Private method
				'scheduleRollingSoftDeletions',
			);

			// @ts-expect-error Private method
			const scheduleNextHardDeletionSpy = jest.spyOn(pruningService, 'scheduleNextHardDeletion');

			pruningService.startPruning();

			expect(scheduleRollingSoftDeletionsSpy).not.toHaveBeenCalled();
			expect(scheduleNextHardDeletionSpy).not.toHaveBeenCalled();
		});

		it('should start pruning if service is enabled and DB is migrated', () => {
			const pruningService = new PruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, instanceType: 'main', isMultiMain: true }),
				mock(),
				mock(),
				mock<ExecutionsConfig>({ pruneData: true }),
			);

			const scheduleRollingSoftDeletionsSpy = jest
				// @ts-expect-error Private method
				.spyOn(pruningService, 'scheduleRollingSoftDeletions')
				.mockImplementation();

			const scheduleNextHardDeletionSpy = jest
				// @ts-expect-error Private method
				.spyOn(pruningService, 'scheduleNextHardDeletion')
				.mockImplementation();

			pruningService.startPruning();

			expect(scheduleRollingSoftDeletionsSpy).toHaveBeenCalled();
			expect(scheduleNextHardDeletionSpy).toHaveBeenCalled();
		});
	});
});
