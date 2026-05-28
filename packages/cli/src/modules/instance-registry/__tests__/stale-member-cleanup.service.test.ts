import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { InstanceRegistryService } from '../instance-registry.service';
import { REGISTRY_CONSTANTS } from '../instance-registry.types';
import { StaleMemberCleanupService } from '../stale-member-cleanup.service';

const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
const instanceSettings = mock<InstanceSettings>({ isLeader: true });
const registryService = mock<InstanceRegistryService>();

let service: StaleMemberCleanupService;

beforeEach(() => {
	jest.useFakeTimers();
	jest.clearAllMocks();
	service = new StaleMemberCleanupService(logger, instanceSettings, registryService);
});

afterEach(() => {
	service.shutdown();
	jest.useRealTimers();
});

describe('StaleMemberCleanupService', () => {
	describe('init', () => {
		it('should start cleanup when instance is leader', () => {
			registryService.cleanupStaleMembers.mockResolvedValue(0);
			Object.assign(instanceSettings, { isLeader: true });

			service.init();
			jest.advanceTimersByTime(REGISTRY_CONSTANTS.RECONCILIATION_INTERVAL_MS);

			expect(registryService.cleanupStaleMembers).toHaveBeenCalled();
		});

		it('should not start cleanup when instance is not leader', () => {
			Object.assign(instanceSettings, { isLeader: false });

			service.init();
			jest.advanceTimersByTime(REGISTRY_CONSTANTS.RECONCILIATION_INTERVAL_MS * 2);

			expect(registryService.cleanupStaleMembers).not.toHaveBeenCalled();
		});
	});

	describe('startCleanup', () => {
		it('should schedule cleanup at reconciliation interval', () => {
			registryService.cleanupStaleMembers.mockResolvedValue(0);

			service.startCleanup();

			expect(registryService.cleanupStaleMembers).not.toHaveBeenCalled();

			jest.advanceTimersByTime(REGISTRY_CONSTANTS.RECONCILIATION_INTERVAL_MS);

			expect(registryService.cleanupStaleMembers).toHaveBeenCalledTimes(1);
		});

		it('should not start if shutting down', () => {
			service.shutdown();
			service.startCleanup();

			jest.advanceTimersByTime(REGISTRY_CONSTANTS.RECONCILIATION_INTERVAL_MS * 2);

			expect(registryService.cleanupStaleMembers).not.toHaveBeenCalled();
		});
	});

	describe('cleanup', () => {
		it('should log when stale members are removed', async () => {
			registryService.cleanupStaleMembers.mockResolvedValue(3);

			service.startCleanup();
			await jest.advanceTimersByTimeAsync(REGISTRY_CONSTANTS.RECONCILIATION_INTERVAL_MS);

			expect(logger.scoped('instance-registry').info).toHaveBeenCalledWith(
				'Cleaned up stale registry members',
				{ removed: 3 },
			);
		});

		it('should not log when no stale members are found', async () => {
			registryService.cleanupStaleMembers.mockResolvedValue(0);

			service.startCleanup();
			await jest.advanceTimersByTimeAsync(REGISTRY_CONSTANTS.RECONCILIATION_INTERVAL_MS);

			expect(logger.scoped('instance-registry').info).not.toHaveBeenCalled();
		});

		it('should catch and log errors without throwing', async () => {
			registryService.cleanupStaleMembers.mockRejectedValue(new Error('Redis down'));

			service.startCleanup();
			await jest.advanceTimersByTimeAsync(REGISTRY_CONSTANTS.RECONCILIATION_INTERVAL_MS);

			expect(logger.scoped('instance-registry').warn).toHaveBeenCalledWith(
				'Failed to clean up stale registry members',
				expect.objectContaining({ error: expect.any(Error) }),
			);
		});
	});

	describe('stopCleanup', () => {
		it('should stop the cleanup interval on leader stepdown', () => {
			registryService.cleanupStaleMembers.mockResolvedValue(0);

			service.startCleanup();
			service.stopCleanup();

			jest.advanceTimersByTime(REGISTRY_CONSTANTS.RECONCILIATION_INTERVAL_MS * 2);

			expect(registryService.cleanupStaleMembers).not.toHaveBeenCalled();
		});
	});

	describe('shutdown', () => {
		it('should stop the cleanup interval', () => {
			registryService.cleanupStaleMembers.mockResolvedValue(0);

			service.startCleanup();
			service.shutdown();

			jest.advanceTimersByTime(REGISTRY_CONSTANTS.RECONCILIATION_INTERVAL_MS * 2);

			expect(registryService.cleanupStaleMembers).not.toHaveBeenCalled();
		});
	});
});
