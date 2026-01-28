/* eslint-disable @typescript-eslint/unbound-method */

import type { ExecutionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { BinaryDataService } from 'n8n-core';

import type { FsStore } from '@/executions/execution-data/fs-store';
import { ExecutionPersistence } from '@/executions/execution-persistence';

describe('ExecutionPersistence', () => {
	const executionRepository = mock<ExecutionRepository>();
	const binaryDataService = mock<BinaryDataService>();
	const fsStore = mock<FsStore>();

	const executionPersistence = new ExecutionPersistence(
		executionRepository,
		binaryDataService,
		fsStore,
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('hardDelete', () => {
		const baseTarget = { workflowId: 'wf-1', executionId: 'exec-1' };

		it('should delete execution, binary data, and fs data when storedAt is fs', async () => {
			const target = { ...baseTarget, storedAt: 'fs' as const };

			await executionPersistence.hardDelete(target);

			expect(executionRepository.deleteByIds).toHaveBeenCalledWith(['exec-1']);
			expect(binaryDataService.deleteMany).toHaveBeenCalledWith([{ type: 'execution', ...target }]);
			expect(fsStore.delete).toHaveBeenCalledWith([target]);
		});

		it('should delete execution and binary data but not fs data when storedAt is db', async () => {
			const target = { ...baseTarget, storedAt: 'db' as const };

			await executionPersistence.hardDelete(target);

			expect(executionRepository.deleteByIds).toHaveBeenCalledWith(['exec-1']);
			expect(binaryDataService.deleteMany).toHaveBeenCalledWith([{ type: 'execution', ...target }]);
			expect(fsStore.delete).not.toHaveBeenCalled();
		});

		it('should handle array of targets', async () => {
			const targets = [
				{ workflowId: 'wf-1', executionId: 'exec-1', storedAt: 'fs' as const },
				{ workflowId: 'wf-2', executionId: 'exec-2', storedAt: 'db' as const },
			];

			await executionPersistence.hardDelete(targets);

			expect(executionRepository.deleteByIds).toHaveBeenCalledWith(['exec-1', 'exec-2']);
			expect(binaryDataService.deleteMany).toHaveBeenCalledWith([
				{ type: 'execution', ...targets[0] },
				{ type: 'execution', ...targets[1] },
			]);
			expect(fsStore.delete).toHaveBeenCalledWith([targets[0]]);
		});

		it('should skip all operations when given empty array', async () => {
			await executionPersistence.hardDelete([]);

			expect(executionRepository.deleteByIds).not.toHaveBeenCalled();
			expect(binaryDataService.deleteMany).not.toHaveBeenCalled();
			expect(fsStore.delete).not.toHaveBeenCalled();
		});
	});
});
