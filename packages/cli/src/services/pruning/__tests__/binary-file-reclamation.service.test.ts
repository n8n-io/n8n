import { mockLogger } from '@n8n/backend-test-utils';
import type { BinaryFileReclamationConfig } from '@n8n/config';
import type { ExecutionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings, StorageConfig } from 'n8n-core';
import { promises as fs } from 'node:fs';

import type { EventService } from '@/events/event.service';

import { BinaryFileReclamationService } from '../binary-file-reclamation.service';

jest.mock('node:fs', () => ({
	promises: {
		statfs: jest.fn(),
		rm: jest.fn(),
	},
}));

jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	sleep: jest.fn().mockResolvedValue(undefined),
}));

const mockedFs = jest.mocked(fs);

describe('BinaryFileReclamationService', () => {
	const n8nFolder = '/tmp/n8n-test';
	const storagePath = '/tmp/n8n-test/storage';

	function createService({
		enabled = true,
		maxStorageBytes = 1_000_000,
		highWatermark = 0.8,
		lowWatermark = 0.6,
		batchSize = 100,
		batchDelayMs = 0,
		checkIntervalMinutes = 30,
		isLeader = true,
		instanceType = 'main' as const,
		executionRepository = mock<ExecutionRepository>(),
		eventService = mock<EventService>(),
	} = {}) {
		const config = mock<BinaryFileReclamationConfig>({
			enabled,
			maxStorageBytes,
			highWatermark,
			lowWatermark,
			batchSize,
			batchDelayMs,
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

	function mockStorageUsage(usedBytes: number, totalBlocks = 1_000_000) {
		mockedFs.statfs.mockResolvedValueOnce({
			blocks: totalBlocks,
			bfree: totalBlocks - usedBytes,
			bsize: 1,
		} as unknown as ReturnType<typeof fs.statfs> extends Promise<infer T> ? T : never);
	}

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
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
		it('should do nothing when disabled', () => {
			const { service, executionRepository } = createService({ enabled: false });

			service.startReclamation();

			expect(executionRepository.findCompletedExecutionsOldestFirst).not.toHaveBeenCalled();
		});

		it('should do nothing when storage is below high watermark', async () => {
			const { service, executionRepository } = createService({
				maxStorageBytes: 1_000_000,
				highWatermark: 0.8,
			});

			// 500_000 used bytes < 800_000 high threshold
			mockStorageUsage(500_000);

			service.startReclamation();
			jest.advanceTimersByTime(30 * 60 * 1000);
			await jest.advanceTimersToNextTimerAsync();

			expect(executionRepository.findCompletedExecutionsOldestFirst).not.toHaveBeenCalled();
		});

		it('should stop reclaiming when storage drops below low watermark', async () => {
			const executionRepository = mock<ExecutionRepository>();
			const eventService = mock<EventService>();
			const { service } = createService({
				maxStorageBytes: 1_000_000,
				highWatermark: 0.8,
				lowWatermark: 0.6,
				batchSize: 2,
				batchDelayMs: 0,
				executionRepository,
				eventService,
			});

			// First call: above high watermark (900_000 used > 800_000 threshold)
			mockStorageUsage(900_000);

			executionRepository.findCompletedExecutionsOldestFirst.mockResolvedValueOnce([
				{ id: 'exec1', workflowId: 'wf1', stoppedAt: new Date('2024-01-01') },
				{ id: 'exec2', workflowId: 'wf1', stoppedAt: new Date('2024-01-02') },
			]);

			// After deletion: below low watermark (500_000 used < 600_000 threshold)
			mockStorageUsage(500_000);

			service.startReclamation();
			jest.advanceTimersByTime(30 * 60 * 1000);
			await jest.advanceTimersToNextTimerAsync();

			expect(executionRepository.findCompletedExecutionsOldestFirst).toHaveBeenCalledTimes(1);
			expect(mockedFs.rm).toHaveBeenCalledTimes(2);
			expect(eventService.emit).toHaveBeenCalledWith(
				'binary-files-reclaimed',
				expect.objectContaining({
					totalExecutionsProcessed: 2,
				}),
			);
		});

		it('should respect isShuttingDown flag and exit loop early', async () => {
			jest.useRealTimers();

			const executionRepository = mock<ExecutionRepository>();
			const { service } = createService({
				maxStorageBytes: 1_000_000,
				highWatermark: 0.8,
				lowWatermark: 0.6,
				batchSize: 2,
				batchDelayMs: 0,
				executionRepository,
			});

			// Above high watermark
			mockStorageUsage(900_000);

			executionRepository.findCompletedExecutionsOldestFirst.mockImplementationOnce(async () => {
				service.shutdown();
				return [{ id: 'exec1', workflowId: 'wf1', stoppedAt: new Date('2024-01-01') }];
			});

			// After first batch deletion, still above low watermark
			mockStorageUsage(850_000);

			// @ts-expect-error Accessing private method for testing
			await service.safeCheckAndReclaim();

			expect(executionRepository.findCompletedExecutionsOldestFirst).toHaveBeenCalledTimes(1);
			expect(mockedFs.rm).toHaveBeenCalledTimes(1);
		});

		it('should prevent overlapping runs via concurrency guard', async () => {
			const executionRepository = mock<ExecutionRepository>();
			const { service } = createService({
				maxStorageBytes: 1_000_000,
				highWatermark: 0.8,
				batchDelayMs: 0,
				executionRepository,
			});

			let resolveFirst: () => void;
			const firstCallPromise = new Promise<void>((resolve) => {
				resolveFirst = resolve;
			});

			mockStorageUsage(900_000);
			mockStorageUsage(900_000);

			executionRepository.findCompletedExecutionsOldestFirst.mockImplementation(async () => {
				await firstCallPromise;
				return [];
			});

			// @ts-expect-error Accessing private method for testing
			const firstRun = service.safeCheckAndReclaim();
			// @ts-expect-error Accessing private method for testing
			const secondRun = service.safeCheckAndReclaim();

			resolveFirst!();
			await firstRun;
			await secondRun;

			expect(mockedFs.statfs).toHaveBeenCalledTimes(1);
		});

		it('should do nothing when no prunable executions exist', async () => {
			const executionRepository = mock<ExecutionRepository>();
			const eventService = mock<EventService>();
			const { service } = createService({
				maxStorageBytes: 1_000_000,
				highWatermark: 0.8,
				batchDelayMs: 0,
				executionRepository,
				eventService,
			});

			// Above high watermark
			mockStorageUsage(900_000);

			executionRepository.findCompletedExecutionsOldestFirst.mockResolvedValueOnce([]);

			// @ts-expect-error Accessing private method for testing
			await service.safeCheckAndReclaim();

			expect(executionRepository.findCompletedExecutionsOldestFirst).toHaveBeenCalledTimes(1);
			expect(mockedFs.rm).not.toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledWith(
				'binary-files-reclaimed',
				expect.objectContaining({
					totalExecutionsProcessed: 0,
					totalBytesReclaimed: 0,
				}),
			);
		});
	});
});
