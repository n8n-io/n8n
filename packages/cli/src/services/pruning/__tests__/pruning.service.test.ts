import type { ExecutionsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { MultiMainSetup } from '@/scaling/multi-main-setup.ee';
import type { OrchestrationService } from '@/services/orchestration.service';
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
				mock<InstanceSettings>({ isLeader: true }),
				mock(),
				mock(),
				mock<OrchestrationService>({
					isMultiMainSetupEnabled: true,
					multiMainSetup: mock<MultiMainSetup>(),
				}),
				mock(),
			);
			const startPruningSpy = jest.spyOn(pruningService, 'startPruning');

			pruningService.init();

			expect(startPruningSpy).toHaveBeenCalled();
		});

		it('should not start pruning on main instance that is a follower', () => {
			const pruningService = new PruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: false }),
				mock(),
				mock(),
				mock<OrchestrationService>({
					isMultiMainSetupEnabled: true,
					multiMainSetup: mock<MultiMainSetup>(),
				}),
				mock(),
			);
			const startPruningSpy = jest.spyOn(pruningService, 'startPruning');

			pruningService.init();

			expect(startPruningSpy).not.toHaveBeenCalled();
		});

		it('should register leadership events if main on multi-main setup', () => {
			const pruningService = new PruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true }),
				mock(),
				mock(),
				mock<OrchestrationService>({
					isMultiMainSetupEnabled: true,
					multiMainSetup: mock<MultiMainSetup>({ on: jest.fn() }),
				}),
				mock(),
			);

			pruningService.init();

			// @ts-expect-error Private method
			expect(pruningService.orchestrationService.multiMainSetup.on).toHaveBeenCalledWith(
				'leader-takeover',
				expect.any(Function),
			);

			// @ts-expect-error Private method
			expect(pruningService.orchestrationService.multiMainSetup.on).toHaveBeenCalledWith(
				'leader-stepdown',
				expect.any(Function),
			);
		});
	});

	describe('isEnabled', () => {
		it('should return `true` based on config if leader main', () => {
			const pruningService = new PruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, instanceType: 'main' }),
				mock(),
				mock(),
				mock<OrchestrationService>({
					isMultiMainSetupEnabled: true,
					multiMainSetup: mock<MultiMainSetup>(),
				}),
				mock<ExecutionsConfig>({ pruneData: true }),
			);

			expect(pruningService.isEnabled).toBe(true);
		});

		it('should return `false` based on config if leader main', () => {
			const pruningService = new PruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, instanceType: 'main' }),
				mock(),
				mock(),
				mock<OrchestrationService>({
					isMultiMainSetupEnabled: true,
					multiMainSetup: mock<MultiMainSetup>(),
				}),
				mock<ExecutionsConfig>({ pruneData: false }),
			);

			expect(pruningService.isEnabled).toBe(false);
		});

		it('should return `false` if non-main even if config is enabled', () => {
			const pruningService = new PruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: false, instanceType: 'worker' }),
				mock(),
				mock(),
				mock<OrchestrationService>({
					isMultiMainSetupEnabled: true,
					multiMainSetup: mock<MultiMainSetup>(),
				}),
				mock<ExecutionsConfig>({ pruneData: true }),
			);

			expect(pruningService.isEnabled).toBe(false);
		});

		it('should return `false` if follower main even if config is enabled', () => {
			const pruningService = new PruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: false, isFollower: true, instanceType: 'main' }),
				mock(),
				mock(),
				mock<OrchestrationService>({
					isMultiMainSetupEnabled: true,
					multiMainSetup: mock<MultiMainSetup>(),
				}),
				mock<ExecutionsConfig>({ pruneData: true }),
			);

			expect(pruningService.isEnabled).toBe(false);
		});
	});

	describe('startPruning', () => {
		it('should not start pruning if service is disabled', () => {
			const pruningService = new PruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, instanceType: 'main' }),
				mock(),
				mock(),
				mock<OrchestrationService>({
					isMultiMainSetupEnabled: true,
					multiMainSetup: mock<MultiMainSetup>(),
				}),
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
				mock<InstanceSettings>({ isLeader: true, instanceType: 'main' }),
				mock(),
				mock(),
				mock<OrchestrationService>({
					isMultiMainSetupEnabled: true,
					multiMainSetup: mock<MultiMainSetup>(),
				}),
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
