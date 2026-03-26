import { mockLogger } from '@n8n/backend-test-utils';
import type { BinaryFileReclamationConfig } from '@n8n/config';
import type { ExecutionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings, StorageConfig } from 'n8n-core';

import type { EventService } from '@/events/event.service';

import { BinaryFileReclamationService } from '../binary-file-reclamation.service';

jest.mock('node:fs', () => ({
	promises: {
		rm: jest.fn().mockResolvedValue(undefined),
	},
}));

describe('BinaryFileReclamationService', () => {
	const n8nFolder = '/tmp/n8n-test';
	const storagePath = '/tmp/n8n-test/storage';

	function createService({
		enabled = true,
		maxStorageBytes = 1_000_000,
		targetRatio = 0.6,
		batchSize = 100,
		checkIntervalMinutes = 30,
		isLeader = true,
		instanceType = 'main' as const,
		executionRepository = mock<ExecutionRepository>(),
		eventService = mock<EventService>(),
	} = {}) {
		const config = mock<BinaryFileReclamationConfig>({
			enabled,
			maxStorageBytes,
			targetRatio,
			batchSize,
			checkIntervalMinutes,
		});

		const instanceSettings = mock<InstanceSettings>({
			isLeader,
			instanceType,
			n8nFolder,
		});

		const storageConfig = mock<StorageConfig>({
			storagePath,
		});

		const service = new BinaryFileReclamationService(
			mockLogger(),
			instanceSettings,
			executionRepository,
			config,
			storageConfig,
			eventService,
		);

		return { service, executionRepository, eventService, config, instanceSettings };
	}

	// Helper to access private methods for testing
	function getPrivate(service: BinaryFileReclamationService) {
		return service as unknown as {
			checkAndReclaim: () => Promise<void>;
			getDirectorySize: (dirPath: string) => Promise<number>;
		};
	}

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('init', () => {
		it('should start reclamation on leader instance', () => {
			const { service } = createService({ isLeader: true });
			const startSpy = jest.spyOn(service, 'startReclamation');

			service.init();

			expect(startSpy).toHaveBeenCalled();
		});

		it('should not start reclamation on non-leader instance', () => {
			const { service } = createService({ isLeader: false });
			const startSpy = jest.spyOn(service, 'startReclamation');

			service.init();

			expect(startSpy).not.toHaveBeenCalled();
		});
	});

	describe('isEnabled', () => {
		it('should return true when enabled, maxStorageBytes > 0, main instance, and leader', () => {
			const { service } = createService({
				enabled: true,
				maxStorageBytes: 1_000_000,
				isLeader: true,
				instanceType: 'main',
			});

			expect(service.isEnabled).toBe(true);
		});

		it('should return false when config.enabled is false', () => {
			const { service } = createService({ enabled: false });
			expect(service.isEnabled).toBe(false);
		});

		it('should return false when maxStorageBytes is 0', () => {
			const { service } = createService({ maxStorageBytes: 0 });
			expect(service.isEnabled).toBe(false);
		});

		it('should return false when not a leader', () => {
			const { service } = createService({ isLeader: false });
			expect(service.isEnabled).toBe(false);
		});
	});

	describe('checkAndReclaim', () => {
		it('should do nothing when binary data size is below threshold', async () => {
			const { service, executionRepository } = createService({
				maxStorageBytes: 1_000_000,
			});

			const priv = getPrivate(service);
			jest.spyOn(priv, 'getDirectorySize').mockResolvedValueOnce(500_000);

			await priv.checkAndReclaim();

			expect(executionRepository.findCompletedExecutionsOldestFirst).not.toHaveBeenCalled();
		});

		it('should stop reclaiming when binary data size drops below target', async () => {
			const executionRepository = mock<ExecutionRepository>();
			const eventService = mock<EventService>();
			const { service } = createService({
				maxStorageBytes: 1_000_000,
				targetRatio: 0.6,
				batchSize: 2,
				executionRepository,
				eventService,
			});

			const priv = getPrivate(service);
			const sizeSpy = jest.spyOn(priv, 'getDirectorySize');
			sizeSpy
				.mockResolvedValueOnce(1_100_000) // initial: above 1M threshold
				.mockResolvedValueOnce(300_000) // exec1 dir size
				.mockResolvedValueOnce(300_000); // exec2 dir size

			executionRepository.findCompletedExecutionsOldestFirst.mockResolvedValueOnce([
				{ id: 'exec1', workflowId: 'wf1', stoppedAt: new Date('2024-01-01') },
				{ id: 'exec2', workflowId: 'wf1', stoppedAt: new Date('2024-01-02') },
			]);

			await priv.checkAndReclaim();

			// 1_100_000 - 300_000 - 300_000 = 500_000 < 600_000 target
			expect(executionRepository.findCompletedExecutionsOldestFirst).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith(
				'binary-files-reclaimed',
				expect.objectContaining({ totalExecutionsProcessed: 2 }),
			);
		});

		it('should respect isShuttingDown flag and exit loop early', async () => {
			const executionRepository = mock<ExecutionRepository>();
			const { service } = createService({
				maxStorageBytes: 1_000_000,
				targetRatio: 0.6,
				batchSize: 2,
				executionRepository,
			});

			const priv = getPrivate(service);
			const sizeSpy = jest.spyOn(priv, 'getDirectorySize');
			sizeSpy
				.mockResolvedValueOnce(1_100_000) // initial: above threshold
				.mockResolvedValueOnce(50_000); // exec1 dir size

			executionRepository.findCompletedExecutionsOldestFirst.mockImplementationOnce(async () => {
				service.shutdown();
				return [{ id: 'exec1', workflowId: 'wf1', stoppedAt: new Date('2024-01-01') }];
			});

			await priv.checkAndReclaim();

			expect(executionRepository.findCompletedExecutionsOldestFirst).toHaveBeenCalledTimes(1);
		});

		it('should do nothing when no prunable executions exist', async () => {
			const executionRepository = mock<ExecutionRepository>();
			const eventService = mock<EventService>();
			const { service } = createService({
				maxStorageBytes: 1_000_000,
				executionRepository,
				eventService,
			});

			const priv = getPrivate(service);
			jest.spyOn(priv, 'getDirectorySize').mockResolvedValueOnce(1_100_000);

			executionRepository.findCompletedExecutionsOldestFirst.mockResolvedValueOnce([]);

			await priv.checkAndReclaim();

			expect(executionRepository.findCompletedExecutionsOldestFirst).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith(
				'binary-files-reclaimed',
				expect.objectContaining({
					totalExecutionsProcessed: 0,
					totalBytesReclaimed: 0,
				}),
			);
		});

		it('should terminate when executions are exhausted even if still above target', async () => {
			const executionRepository = mock<ExecutionRepository>();
			const eventService = mock<EventService>();
			const { service } = createService({
				maxStorageBytes: 1_000_000,
				targetRatio: 0.6,
				batchSize: 2,
				executionRepository,
				eventService,
			});

			const priv = getPrivate(service);
			const sizeSpy = jest.spyOn(priv, 'getDirectorySize');
			sizeSpy
				.mockResolvedValueOnce(1_100_000) // initial: above threshold
				.mockResolvedValueOnce(100_000) // exec1 dir size
				.mockResolvedValueOnce(100_000); // exec2 dir size

			executionRepository.findCompletedExecutionsOldestFirst
				.mockResolvedValueOnce([
					{ id: 'exec1', workflowId: 'wf1', stoppedAt: new Date('2024-01-01') },
					{ id: 'exec2', workflowId: 'wf1', stoppedAt: new Date('2024-01-02') },
				])
				.mockResolvedValueOnce([]); // no more executions

			await priv.checkAndReclaim();

			// 1_100_000 - 100_000 - 100_000 = 900_000 > 600_000 target, but no more executions
			expect(executionRepository.findCompletedExecutionsOldestFirst).toHaveBeenCalledTimes(2);
			expect(eventService.emit).toHaveBeenCalledWith(
				'binary-files-reclaimed',
				expect.objectContaining({
					totalExecutionsProcessed: 2,
					totalBytesReclaimed: 200_000,
				}),
			);
		});

		it('should not reclaim when binary data directory is empty', async () => {
			const executionRepository = mock<ExecutionRepository>();
			const { service } = createService({
				maxStorageBytes: 1_000_000,
				executionRepository,
			});

			const priv = getPrivate(service);
			jest.spyOn(priv, 'getDirectorySize').mockResolvedValueOnce(0);

			await priv.checkAndReclaim();

			expect(executionRepository.findCompletedExecutionsOldestFirst).not.toHaveBeenCalled();
		});
	});
});
