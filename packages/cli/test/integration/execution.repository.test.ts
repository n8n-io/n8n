import config from '@/config';
import fsp from 'node:fs/promises';
import { mock } from 'jest-mock-extended';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';

jest.mock('fs/promises');

describe('deleteAssociatedData()', () => {
	const pruningService = new ExecutionRepository(mock(), mock(), mock());

	const workflowId = 'ObogjVbqpNOQpiyV';
	const executionId = '999';

	const otherWorkflowId = 'FHio8ftV6SrCAfPJ';
	const otherExecutionId = '888';

	config.set('binaryDataManager.mode', 'filesystem');

	describe('filesystem-v2', () => {
		it('should delete files in nested dirs', async () => {
			const ids = [
				{ workflowId, executionId },
				{ workflowId: otherWorkflowId, executionId: otherExecutionId },
			];

			fsp.rm = jest.fn().mockResolvedValue(undefined);

			const promise = pruningService.deleteAssociatedData(ids);

			await expect(promise).resolves.not.toThrow();

			expect(fsp.rm).toHaveBeenCalledTimes(2);
		});

		it('should suppress error on non-existing filepath', async () => {
			const ids = [{ workflowId: 'does-not-exist', executionId: 'does-not-exist' }];

			fsp.rm = jest.fn().mockResolvedValue(undefined);

			const promise = pruningService.deleteAssociatedData(ids);

			await expect(promise).resolves.not.toThrow();

			expect(fsp.rm).toHaveBeenCalledTimes(1);
		});
	});

	describe('filesystem (legacy)', () => {
		const firstExecutionId = '123';
		const firstUuid = '71f6209b-5d48-41a2-a224-80d529d8bb32';
		const firstLegacyId = firstExecutionId + firstUuid;

		const secondExecutionId = '456';
		const secondUuid = '81f6209b-5d48-41a2-a224-80d529d8bb38';
		const secondLegacyId = secondExecutionId + secondUuid;

		it('should delete files in flat dir', async () => {
			fsp.rm = jest.fn().mockResolvedValue(undefined);
			fsp.readdir = jest.fn().mockResolvedValue([firstLegacyId, secondLegacyId]);

			const promise = pruningService.deleteAssociatedData([
				{ workflowId, executionId: firstExecutionId },
				{ workflowId: otherWorkflowId, executionId: secondExecutionId },
			]);

			await expect(promise).resolves.not.toThrow();

			/**
			 * 2 dirs (v2) + 2 binary files and 2 metadata files (legacy)
			 */
			const CALL_COUNT = 6;

			expect(fsp.rm).toHaveBeenCalledTimes(CALL_COUNT);
		});
	});
});
