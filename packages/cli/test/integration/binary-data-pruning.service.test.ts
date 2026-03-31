import { mockLogger, createWorkflow, testDb, mockInstance } from '@n8n/backend-test-utils';
import { BinaryDataPruningConfig } from '@n8n/config';
import { ExecutionRepository, DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { BinaryDataConfig, BinaryDataService } from 'n8n-core';
import { InstanceSettings } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';

import { BinaryDataPruningService } from '@/services/pruning/binary-data-pruning.service';

import { createExecution, createSuccessfulExecution } from './shared/db/executions';

describe('BinaryDataPruningService (integration)', () => {
	const instanceSettings = Container.get(InstanceSettings);
	instanceSettings.markAsLeader();

	const binaryDataService = mock<BinaryDataService>();

	const binaryDataConfig = mock<BinaryDataConfig>({
		mode: 'filesystem',
		localStoragePath: '/tmp/n8n/storage',
	});

	let workflow: IWorkflowBase;

	beforeAll(async () => {
		await testDb.init();
		workflow = await createWorkflow();
	});

	beforeEach(async () => {
		await testDb.truncate(['ExecutionEntity']);
		binaryDataService.getTotalStorageSize.mockReset();
		binaryDataService.deleteMany.mockReset();
		binaryDataService.getTotalStorageSize.mockResolvedValue(100 * 1024 * 1024); // 100 MiB
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	function createPruningService(quotaMiB = 50, batchSize = 100) {
		const pruningConfig = mockInstance(BinaryDataPruningConfig);
		pruningConfig.quotaMiB = quotaMiB;
		pruningConfig.intervalMinutes = 60;
		pruningConfig.batchSize = batchSize;

		const service = new BinaryDataPruningService(
			mockLogger(),
			instanceSettings,
			Container.get(DbConnection),
			Container.get(ExecutionRepository),
			binaryDataService,
			binaryDataConfig,
			pruningConfig,
		);

		// Prevent restart fast-forward from triggering (no real binary data dirs in test)
		jest
			.spyOn(service as never, 'executionBinaryDataExists' as never)
			.mockResolvedValue(true as never);

		return service;
	}

	describe('prune', () => {
		it('should query executions ordered by id ASC (oldest first)', async () => {
			const service = createPruningService();

			const exec1 = await createSuccessfulExecution(workflow);
			const exec2 = await createSuccessfulExecution(workflow);
			const exec3 = await createSuccessfulExecution(workflow);

			// After first batch, still over quota to force re-check
			binaryDataService.getTotalStorageSize
				.mockResolvedValueOnce(100 * 1024 * 1024) // over quota
				.mockResolvedValueOnce(30 * 1024 * 1024); // under after deletion

			await service.prune();

			// Should have been called once with all 3 executions, in order
			expect(binaryDataService.deleteMany).toHaveBeenCalledTimes(1);
			expect(binaryDataService.deleteMany).toHaveBeenCalledWith([
				expect.objectContaining({ executionId: exec1.id }),
				expect.objectContaining({ executionId: exec2.id }),
				expect.objectContaining({ executionId: exec3.id }),
			]);
		});

		it('should support cursor-based pagination across calls', async () => {
			const service = createPruningService(50, 2); // batch size 2

			await createSuccessfulExecution(workflow);
			await createSuccessfulExecution(workflow);
			const exec3 = await createSuccessfulExecution(workflow);
			const exec4 = await createSuccessfulExecution(workflow);

			// First prune: over quota before and after
			binaryDataService.getTotalStorageSize
				.mockResolvedValueOnce(100 * 1024 * 1024)
				.mockResolvedValueOnce(80 * 1024 * 1024); // still over

			await service.prune();
			expect(binaryDataService.deleteMany).toHaveBeenCalledTimes(1);

			// Second prune: still over, but now under after
			binaryDataService.deleteMany.mockClear();
			binaryDataService.getTotalStorageSize
				.mockResolvedValueOnce(80 * 1024 * 1024)
				.mockResolvedValueOnce(30 * 1024 * 1024);

			await service.prune();

			// Should continue from where it left off (exec3, exec4)
			expect(binaryDataService.deleteMany).toHaveBeenCalledTimes(1);
			expect(binaryDataService.deleteMany).toHaveBeenCalledWith([
				expect.objectContaining({ executionId: exec3.id }),
				expect.objectContaining({ executionId: exec4.id }),
			]);
		});

		it('should skip new, running, and waiting executions', async () => {
			const service = createPruningService();

			await createExecution(
				{ status: 'new', startedAt: undefined, stoppedAt: undefined },
				workflow,
			);
			await createExecution({ status: 'running', stoppedAt: undefined }, workflow);
			await createExecution(
				{ status: 'waiting', waitTill: new Date(), stoppedAt: new Date() },
				workflow,
			);
			const successExec = await createSuccessfulExecution(workflow);

			binaryDataService.getTotalStorageSize
				.mockResolvedValueOnce(100 * 1024 * 1024)
				.mockResolvedValueOnce(30 * 1024 * 1024);

			await service.prune();

			// Only the successful execution should be pruned (single batched call)
			expect(binaryDataService.deleteMany).toHaveBeenCalledTimes(1);
			expect(binaryDataService.deleteMany).toHaveBeenCalledWith([
				expect.objectContaining({ executionId: successExec.id }),
			]);
		});

		it('should include error and crashed executions', async () => {
			const service = createPruningService();

			const errorExec = await createExecution({ status: 'error', finished: false }, workflow);
			const crashedExec = await createExecution({ status: 'crashed', finished: false }, workflow);

			binaryDataService.getTotalStorageSize
				.mockResolvedValueOnce(100 * 1024 * 1024)
				.mockResolvedValueOnce(30 * 1024 * 1024);

			await service.prune();

			expect(binaryDataService.deleteMany).toHaveBeenCalledTimes(1);
			expect(binaryDataService.deleteMany).toHaveBeenCalledWith([
				expect.objectContaining({ executionId: errorExec.id }),
				expect.objectContaining({ executionId: crashedExec.id }),
			]);
		});

		it('should return empty batch when cursor is past all executions', async () => {
			const service = createPruningService(50, 1);

			const exec = await createSuccessfulExecution(workflow);

			// First call: prune the only execution
			binaryDataService.getTotalStorageSize
				.mockResolvedValueOnce(100 * 1024 * 1024)
				.mockResolvedValueOnce(80 * 1024 * 1024);

			await service.prune();
			expect(binaryDataService.deleteMany).toHaveBeenCalledWith([
				expect.objectContaining({ executionId: exec.id }),
			]);

			// Second call: no more executions after cursor
			binaryDataService.deleteMany.mockClear();
			binaryDataService.getTotalStorageSize.mockResolvedValueOnce(80 * 1024 * 1024);

			const delay = await service.prune();

			expect(binaryDataService.deleteMany).not.toHaveBeenCalled();
			expect(delay).toBe(60 * 60 * 1000); // normal interval
		});

		it('should pass correct workflowId in deleteMany calls', async () => {
			const service = createPruningService();

			const workflow2 = await createWorkflow();
			const exec1 = await createSuccessfulExecution(workflow);
			const exec2 = await createSuccessfulExecution(workflow2);

			binaryDataService.getTotalStorageSize
				.mockResolvedValueOnce(100 * 1024 * 1024)
				.mockResolvedValueOnce(30 * 1024 * 1024);

			await service.prune();

			expect(binaryDataService.deleteMany).toHaveBeenCalledTimes(1);
			expect(binaryDataService.deleteMany).toHaveBeenCalledWith([
				{ type: 'execution', workflowId: workflow.id, executionId: exec1.id },
				{ type: 'execution', workflowId: workflow2.id, executionId: exec2.id },
			]);
		});
	});
});
