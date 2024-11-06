import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { MultiMainSetup } from '@/scaling/multi-main-setup.ee';
import type { OrchestrationService } from '@/services/orchestration.service';
import { mockLogger } from '@test/mocking';

import { PruningService } from '../pruning.service';

describe('PruningService', () => {
	describe('init', () => {
		it('should start pruning if leader', () => {
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

		it('should not start pruning if follower', () => {
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

		it('should register leadership events if multi-main setup is enabled', () => {
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
				mock<GlobalConfig>({ pruning: { isEnabled: true } }),
			);

			// @ts-expect-error Private method
			const isEnabled = pruningService.isEnabled();

			expect(isEnabled).toBe(true);
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
				mock<GlobalConfig>({ pruning: { isEnabled: false } }),
			);

			// @ts-expect-error Private method
			const isEnabled = pruningService.isEnabled();

			expect(isEnabled).toBe(false);
		});

		it('should return `false` if non-main even if enabled', () => {
			const pruningService = new PruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: false, instanceType: 'worker' }),
				mock(),
				mock(),
				mock<OrchestrationService>({
					isMultiMainSetupEnabled: true,
					multiMainSetup: mock<MultiMainSetup>(),
				}),
				mock<GlobalConfig>({ pruning: { isEnabled: true } }),
			);

			// @ts-expect-error Private method
			const isEnabled = pruningService.isEnabled();

			expect(isEnabled).toBe(false);
		});

		it('should return `false` if follower main even if enabled', () => {
			const pruningService = new PruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: false, isFollower: true, instanceType: 'main' }),
				mock(),
				mock(),
				mock<OrchestrationService>({
					isMultiMainSetupEnabled: true,
					multiMainSetup: mock<MultiMainSetup>(),
				}),
				mock<GlobalConfig>({ pruning: { isEnabled: true }, multiMainSetup: { enabled: true } }),
			);

			// @ts-expect-error Private method
			const isEnabled = pruningService.isEnabled();

			expect(isEnabled).toBe(false);
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
				mock<GlobalConfig>({ pruning: { isEnabled: false } }),
			);

			// @ts-expect-error Private method
			const setSoftDeletionInterval = jest.spyOn(pruningService, 'setSoftDeletionInterval');

			// @ts-expect-error Private method
			const scheduleHardDeletion = jest.spyOn(pruningService, 'scheduleHardDeletion');

			pruningService.startPruning();

			expect(setSoftDeletionInterval).not.toHaveBeenCalled();
			expect(scheduleHardDeletion).not.toHaveBeenCalled();
		});

		it('should start pruning if service is enabled', () => {
			const pruningService = new PruningService(
				mockLogger(),
				mock<InstanceSettings>({ isLeader: true, instanceType: 'main' }),
				mock(),
				mock(),
				mock<OrchestrationService>({
					isMultiMainSetupEnabled: true,
					multiMainSetup: mock<MultiMainSetup>(),
				}),
				mock<GlobalConfig>({ pruning: { isEnabled: true } }),
			);

			const setSoftDeletionInterval = jest
				// @ts-expect-error Private method
				.spyOn(pruningService, 'setSoftDeletionInterval')
				.mockImplementation();

			const scheduleHardDeletion = jest
				// @ts-expect-error Private method
				.spyOn(pruningService, 'scheduleHardDeletion')
				.mockImplementation();

			pruningService.startPruning();

			expect(setSoftDeletionInterval).toHaveBeenCalled();
			expect(scheduleHardDeletion).toHaveBeenCalled();
		});
	});
});
