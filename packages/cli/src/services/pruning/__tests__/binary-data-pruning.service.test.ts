import { mockLogger } from '@n8n/backend-test-utils';
import type { BinaryDataPruningConfig } from '@n8n/config';
import type { DbConnection, ExecutionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { BinaryDataConfig, BinaryDataService, InstanceSettings } from 'n8n-core';

import { BinaryDataPruningService } from '../binary-data-pruning.service';

describe('BinaryDataPruningService', () => {
	const dbConnection = mock<DbConnection>({
		connectionState: { migrated: true },
	});

	function createService({
		isLeader = true,
		instanceType = 'main' as const,
		quotaMiB = 100,
		binaryDataMode = 'filesystem' as const,
		intervalMinutes = 60,
		batchSize = 100,
		executionRepository = mock<ExecutionRepository>(),
		binaryDataService = mock<BinaryDataService>(),
	} = {}) {
		const instanceSettings = mock<InstanceSettings>({
			isLeader,
			instanceType,
			isMultiMain: true,
		});

		const binaryDataConfig = mock<BinaryDataConfig>({
			mode: binaryDataMode,
			localStoragePath: '/tmp/n8n/storage',
		});

		const pruningConfig = mock<BinaryDataPruningConfig>({
			quotaMiB,
			intervalMinutes,
			batchSize,
		});

		const service = new BinaryDataPruningService(
			mockLogger(),
			instanceSettings,
			dbConnection,
			executionRepository,
			binaryDataService,
			binaryDataConfig,
			pruningConfig,
		);

		return { service, instanceSettings, executionRepository, binaryDataService };
	}

	describe('init', () => {
		it('should start pruning on main instance that is the leader', () => {
			const { service } = createService();
			const spy = jest.spyOn(service, 'startPruning');

			service.init();

			expect(spy).toHaveBeenCalled();
		});

		it('should not start pruning on follower', () => {
			const { service } = createService({ isLeader: false });
			const spy = jest.spyOn(service, 'startPruning');

			service.init();

			expect(spy).not.toHaveBeenCalled();
		});

		it('should throw if quota is set but mode is not filesystem', () => {
			const { service } = createService({ binaryDataMode: 's3' as 'filesystem' });

			expect(() => service.init()).toThrow(
				'Binary data pruning is only supported in filesystem mode',
			);
		});

		it('should not throw if quota is 0 regardless of mode', () => {
			const { service } = createService({ quotaMiB: 0, binaryDataMode: 's3' as 'filesystem' });

			expect(() => service.init()).not.toThrow();
		});
	});

	describe('isEnabled', () => {
		it('should return true when quota > 0 and leader main', () => {
			const { service } = createService({ quotaMiB: 100 });

			expect(service.isEnabled).toBe(true);
		});

		it('should return false when quota is 0', () => {
			const { service } = createService({ quotaMiB: 0 });

			expect(service.isEnabled).toBe(false);
		});

		it('should return false when not leader', () => {
			const { service } = createService({ isLeader: false });

			expect(service.isEnabled).toBe(false);
		});

		it('should return false when not main instance type', () => {
			const { service } = createService({ instanceType: 'worker' as 'main' });

			expect(service.isEnabled).toBe(false);
		});
	});

	describe('startPruning', () => {
		it('should not schedule if service is disabled', () => {
			const { service } = createService({ quotaMiB: 0 });
			const spy = jest.spyOn(
				service,
				// @ts-expect-error Private method
				'scheduleNextPruning',
			);

			service.startPruning();

			expect(spy).not.toHaveBeenCalled();
		});

		it('should schedule if service is enabled and DB is migrated', () => {
			const { service } = createService();
			const spy = jest
				// @ts-expect-error Private method
				.spyOn(service, 'scheduleNextPruning')
				.mockImplementation();

			service.startPruning();

			expect(spy).toHaveBeenCalled();
		});
	});

	describe('stopPruning', () => {
		afterEach(() => jest.restoreAllMocks());

		it('should clear timeout when stopping', () => {
			const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

			const { service } = createService();

			// Simulate an active timer
			// @ts-expect-error Private field
			service.pruningTimeout = setTimeout(() => {}, 100_000);

			service.stopPruning();

			expect(clearTimeoutSpy).toHaveBeenCalled();
		});
	});

	describe('prune', () => {
		it('should do nothing when under quota', async () => {
			const { service, binaryDataService } = createService({ quotaMiB: 100 });
			binaryDataService.getTotalStorageSize.mockResolvedValue(50 * 1024 * 1024); // 50 MiB

			const delay = await service.prune();

			expect(delay).toBe(60 * 60 * 1000); // intervalMinutes in ms
			expect(binaryDataService.deleteMany).not.toHaveBeenCalled();
		});

		it('should delete binary data for oldest executions when over quota', async () => {
			const executionRepository = mock<ExecutionRepository>();
			const binaryDataService = mock<BinaryDataService>();
			const { service } = createService({ quotaMiB: 10, executionRepository, binaryDataService });

			// Prevent restart fast-forward from triggering
			jest
				.spyOn(service as never, 'executionBinaryDataExists' as never)
				.mockResolvedValue(true as never);

			binaryDataService.getTotalStorageSize
				.mockResolvedValueOnce(20 * 1024 * 1024) // 20 MiB - over quota
				.mockResolvedValueOnce(5 * 1024 * 1024); // 5 MiB - under after deletion

			executionRepository.findCompletedExecutionsAfter.mockResolvedValue([
				{ executionId: '1', workflowId: 'wf1' },
				{ executionId: '2', workflowId: 'wf1' },
			]);

			const delay = await service.prune();

			expect(binaryDataService.deleteMany).toHaveBeenCalledTimes(1);
			expect(binaryDataService.deleteMany).toHaveBeenCalledWith([
				{ type: 'execution', workflowId: 'wf1', executionId: '1' },
				{ type: 'execution', workflowId: 'wf1', executionId: '2' },
			]);
			expect(delay).toBe(60 * 60 * 1000); // back to normal interval
		});

		it('should return 1s delay when still over quota after batch', async () => {
			const executionRepository = mock<ExecutionRepository>();
			const binaryDataService = mock<BinaryDataService>();
			const { service } = createService({
				quotaMiB: 10,
				batchSize: 2,
				executionRepository,
				binaryDataService,
			});

			jest
				.spyOn(service as never, 'executionBinaryDataExists' as never)
				.mockResolvedValue(true as never);

			binaryDataService.getTotalStorageSize
				.mockResolvedValueOnce(100 * 1024 * 1024) // way over quota
				.mockResolvedValueOnce(90 * 1024 * 1024); // still over after batch

			executionRepository.findCompletedExecutionsAfter.mockResolvedValue([
				{ executionId: '1', workflowId: 'wf1' },
				{ executionId: '2', workflowId: 'wf1' },
			]);

			const delay = await service.prune();

			expect(binaryDataService.deleteMany).toHaveBeenCalledTimes(1);
			expect(delay).toBe(1_000); // 1 second - need more work
		});

		it('should advance cursor across multiple prune calls', async () => {
			const executionRepository = mock<ExecutionRepository>();
			const binaryDataService = mock<BinaryDataService>();
			const { service } = createService({
				quotaMiB: 10,
				batchSize: 2,
				executionRepository,
				binaryDataService,
			});

			// First call: over quota
			binaryDataService.getTotalStorageSize
				.mockResolvedValueOnce(20 * 1024 * 1024)
				.mockResolvedValueOnce(15 * 1024 * 1024); // still over

			executionRepository.findCompletedExecutionsAfter.mockResolvedValueOnce([
				{ executionId: '5', workflowId: 'wf1' },
				{ executionId: '8', workflowId: 'wf1' },
			]);

			await service.prune();

			// Second call: still over quota
			binaryDataService.getTotalStorageSize
				.mockResolvedValueOnce(15 * 1024 * 1024)
				.mockResolvedValueOnce(5 * 1024 * 1024); // now under

			executionRepository.findCompletedExecutionsAfter.mockResolvedValueOnce([
				{ executionId: '10', workflowId: 'wf2' },
			]);

			await service.prune();

			// Verify cursor was passed correctly on second call
			expect(executionRepository.findCompletedExecutionsAfter).toHaveBeenNthCalledWith(
				1,
				undefined, // no cursor on first call
				2,
			);
			expect(executionRepository.findCompletedExecutionsAfter).toHaveBeenNthCalledWith(
				2,
				'8', // cursor from first call (last in batch)
				2,
			);
		});

		it('should return interval delay when no executions remain', async () => {
			const executionRepository = mock<ExecutionRepository>();
			const binaryDataService = mock<BinaryDataService>();
			const { service } = createService({
				quotaMiB: 10,
				executionRepository,
				binaryDataService,
			});

			binaryDataService.getTotalStorageSize.mockResolvedValue(20 * 1024 * 1024);
			executionRepository.findCompletedExecutionsAfter.mockResolvedValue([]);

			const delay = await service.prune();

			expect(delay).toBe(60 * 60 * 1000);
			expect(binaryDataService.deleteMany).not.toHaveBeenCalled();
		});
	});
});
