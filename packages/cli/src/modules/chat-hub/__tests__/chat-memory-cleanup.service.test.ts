import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { ChatMemoryCleanupService } from '../chat-memory-cleanup.service';
import type { ChatMemoryRepository } from '../chat-memory.repository';
import type { ChatMemorySessionRepository } from '../chat-memory-session.repository';

describe('ChatMemoryCleanupService', () => {
	const createService = (
		instanceSettings: Partial<InstanceSettings>,
		memoryRepository?: ChatMemoryRepository,
		memorySessionRepository?: ChatMemorySessionRepository,
	) => {
		return new ChatMemoryCleanupService(
			mockLogger(),
			mock<InstanceSettings>(instanceSettings),
			memoryRepository ?? mock<ChatMemoryRepository>(),
			memorySessionRepository ?? mock<ChatMemorySessionRepository>(),
		);
	};

	describe('isEnabled', () => {
		it('should return true when instance is main and leader', () => {
			const service = createService({ instanceType: 'main', isLeader: true });

			// @ts-expect-error accessing private property
			expect(service.isEnabled).toBe(true);
		});

		it('should return false when instance is not main', () => {
			const service = createService({ instanceType: 'worker', isLeader: true });

			// @ts-expect-error accessing private property
			expect(service.isEnabled).toBe(false);
		});

		it('should return false when instance is not leader', () => {
			const service = createService({ instanceType: 'main', isLeader: false });

			// @ts-expect-error accessing private property
			expect(service.isEnabled).toBe(false);
		});
	});

	describe('startCleanup', () => {
		afterEach(() => jest.restoreAllMocks());

		it('should not start cleanup when service is disabled', () => {
			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			const service = createService({ instanceType: 'main', isLeader: false });

			service.startCleanup();

			expect(setIntervalSpy).not.toHaveBeenCalled();
		});

		it('should start cleanup when service is enabled', () => {
			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			const service = createService({ instanceType: 'main', isLeader: true });

			service.startCleanup();

			expect(setIntervalSpy).toHaveBeenCalled();

			// Cleanup the interval
			service.stopCleanup();
		});

		it('should not start cleanup when shutting down', () => {
			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			const service = createService({ instanceType: 'main', isLeader: true });

			// @ts-expect-error accessing private property
			service.isShuttingDown = true;

			service.startCleanup();

			expect(setIntervalSpy).not.toHaveBeenCalled();
		});
	});

	describe('stopCleanup', () => {
		afterEach(() => jest.restoreAllMocks());

		it('should stop cleanup when called', () => {
			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

			const service = createService({ instanceType: 'main', isLeader: true });

			// Simulate that cleanup was started
			// @ts-expect-error accessing private property
			service.cleanupInterval = setInterval(() => {}, 1000);

			service.stopCleanup();

			expect(clearIntervalSpy).toHaveBeenCalled();
			// @ts-expect-error accessing private property
			expect(service.cleanupInterval).toBeUndefined();
		});

		it('should do nothing when cleanup was not started', () => {
			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

			const service = createService({ instanceType: 'main', isLeader: false });

			service.stopCleanup();

			expect(clearIntervalSpy).not.toHaveBeenCalled();
		});
	});

	describe('shutdown', () => {
		it('should set isShuttingDown and stop cleanup', () => {
			const service = createService({ instanceType: 'main', isLeader: true });

			const stopCleanupSpy = jest.spyOn(service, 'stopCleanup').mockImplementation();

			service.shutdown();

			// @ts-expect-error accessing private property
			expect(service.isShuttingDown).toBe(true);
			expect(stopCleanupSpy).toHaveBeenCalled();
		});
	});

	describe('runCleanup', () => {
		it('should delete expired memory entries and orphaned memory sessions', async () => {
			const memoryRepository = mock<ChatMemoryRepository>();
			const memorySessionRepository = mock<ChatMemorySessionRepository>();

			memoryRepository.deleteExpiredEntries.mockResolvedValue(5);
			memorySessionRepository.deleteOrphanedSessions.mockResolvedValue(2);

			const service = createService(
				{ instanceType: 'main', isLeader: true },
				memoryRepository,
				memorySessionRepository,
			);

			await service.runCleanup();

			expect(memoryRepository.deleteExpiredEntries).toHaveBeenCalledTimes(1);
			expect(memorySessionRepository.deleteOrphanedSessions).toHaveBeenCalledTimes(1);
		});

		it('should handle errors gracefully', async () => {
			const memoryRepository = mock<ChatMemoryRepository>();
			const memorySessionRepository = mock<ChatMemorySessionRepository>();

			memoryRepository.deleteExpiredEntries.mockRejectedValue(new Error('Database error'));

			const service = createService(
				{ instanceType: 'main', isLeader: true },
				memoryRepository,
				memorySessionRepository,
			);

			// Should not throw
			await expect(service.runCleanup()).resolves.not.toThrow();

			expect(memoryRepository.deleteExpiredEntries).toHaveBeenCalledTimes(1);
			// Session cleanup should not be called since memory cleanup failed
			expect(memorySessionRepository.deleteOrphanedSessions).not.toHaveBeenCalled();
		});

		it('should continue to delete orphaned memory sessions even when no memory entries are deleted', async () => {
			const memoryRepository = mock<ChatMemoryRepository>();
			const memorySessionRepository = mock<ChatMemorySessionRepository>();

			memoryRepository.deleteExpiredEntries.mockResolvedValue(0);
			memorySessionRepository.deleteOrphanedSessions.mockResolvedValue(3);

			const service = createService(
				{ instanceType: 'main', isLeader: true },
				memoryRepository,
				memorySessionRepository,
			);

			await service.runCleanup();

			expect(memoryRepository.deleteExpiredEntries).toHaveBeenCalledTimes(1);
			expect(memorySessionRepository.deleteOrphanedSessions).toHaveBeenCalledTimes(1);
		});
	});
});
