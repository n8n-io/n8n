import type { Logger } from '@n8n/backend-common';
import type { CacheService } from '@n8n/backend-services';
import type { ExecutionsConfig } from '@n8n/config';
import type { IWorkflowBase, IWorkflowExecutionDataProcess } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { UnsavedManualExecutionService } from '../unsaved-manual-execution.service';

describe('UnsavedManualExecutionService', () => {
	const cacheService = mock<CacheService>();
	const executionsConfig = mock<ExecutionsConfig>();
	const service = new UnsavedManualExecutionService(cacheService, executionsConfig, mock<Logger>());

	const executionId = '42';
	const cacheKey = 'unsaved-manual-execution:42';
	const oneHourMs = 60 * 60 * 1000;

	/** A manual run in the editor that n8n will not save. */
	const unsavedRun: Pick<
		IWorkflowExecutionDataProcess,
		'executionMode' | 'workflowData' | 'userId' | 'pushRef'
	> = {
		executionMode: 'manual',
		workflowData: mock<IWorkflowBase>({ settings: { saveManualExecutions: false } }),
		userId: 'alice',
		pushRef: 'push-ref',
	};

	beforeEach(() => {
		cacheService.get.mockReset();
		cacheService.set.mockReset();
		executionsConfig.pruneData = true;
		executionsConfig.pruneDataHardDeleteBuffer = 1;
	});

	describe('recordStarter', () => {
		it('records the user who starts a manual run that n8n will not save, for one buffer', async () => {
			await service.recordStarter(executionId, unsavedRun);

			expect(cacheService.set).toHaveBeenCalledWith(cacheKey, 'alice', oneHourMs);
		});

		it.each([
			[
				'n8n saves the run',
				{
					...unsavedRun,
					workflowData: mock<IWorkflowBase>({ settings: { saveManualExecutions: true } }),
				},
			],
			['the run is not manual', { ...unsavedRun, executionMode: 'webhook' as const }],
			['no browser shows the run', { ...unsavedRun, pushRef: undefined }],
			['no user started the run', { ...unsavedRun, userId: undefined }],
		])('records nothing when %s', async (_, run) => {
			await service.recordStarter(executionId, run);

			expect(cacheService.set).not.toHaveBeenCalled();
		});

		it('records nothing while pruning is off', async () => {
			executionsConfig.pruneData = false;

			await service.recordStarter(executionId, unsavedRun);

			expect(cacheService.set).not.toHaveBeenCalled();
		});

		it('records nothing with no hard-delete buffer', async () => {
			executionsConfig.pruneDataHardDeleteBuffer = 0;

			await service.recordStarter(executionId, unsavedRun);

			expect(cacheService.set).not.toHaveBeenCalled();
		});

		it('does not fail the run when the cache fails', async () => {
			cacheService.set.mockRejectedValueOnce(new Error('Cache unavailable'));

			await expect(service.recordStarter(executionId, unsavedRun)).resolves.toBeUndefined();
		});
	});

	describe('keep', () => {
		it('restarts the buffer of a recorded starter', async () => {
			cacheService.get.mockResolvedValue('alice');

			await expect(service.keep(executionId)).resolves.toBe(true);

			expect(cacheService.get).toHaveBeenCalledWith(cacheKey);
			expect(cacheService.set).toHaveBeenCalledWith(cacheKey, 'alice', oneHourMs);
		});

		it('keeps nothing for an execution without a starter', async () => {
			cacheService.get.mockResolvedValue(undefined);

			await expect(service.keep(executionId)).resolves.toBe(false);

			expect(cacheService.set).not.toHaveBeenCalled();
		});

		it('keeps nothing while pruning is off', async () => {
			executionsConfig.pruneData = false;
			cacheService.get.mockResolvedValue('alice');

			await expect(service.keep(executionId)).resolves.toBe(false);
		});

		it('keeps nothing when the cache fails', async () => {
			cacheService.get.mockRejectedValueOnce(new Error('Cache unavailable'));

			await expect(service.keep(executionId)).resolves.toBe(false);
		});

		it('keeps nothing when the restarted buffer cannot be written', async () => {
			cacheService.get.mockResolvedValue('alice');
			cacheService.set.mockRejectedValueOnce(new Error('Cache unavailable'));

			await expect(service.keep(executionId)).resolves.toBe(false);
		});
	});

	describe('isStarter', () => {
		beforeEach(() => {
			cacheService.get.mockResolvedValue('alice');
		});

		it('is true for the user who started the run', async () => {
			await expect(service.isStarter(executionId, 'alice')).resolves.toBe(true);
		});

		it('is false for another user', async () => {
			await expect(service.isStarter(executionId, 'bob')).resolves.toBe(false);
		});

		it('is false while pruning is off', async () => {
			executionsConfig.pruneData = false;

			await expect(service.isStarter(executionId, 'alice')).resolves.toBe(false);
		});

		it('is false when the cache fails', async () => {
			cacheService.get.mockRejectedValueOnce(new Error('Cache unavailable'));

			await expect(service.isStarter(executionId, 'alice')).resolves.toBe(false);
		});
	});
});
