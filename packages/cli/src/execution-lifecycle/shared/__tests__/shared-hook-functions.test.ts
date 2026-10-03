import { mockInstance } from '@n8n/backend-test-utils';
import { mock } from 'vitest-mock-extended';
import type { IRun, IWorkflowBase } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';

import {
	determineFinalExecutionStatus,
	prepareExecutionDataForDbUpdate,
	updateExistingExecution,
} from '../shared-hook-functions';

describe('determineFinalExecutionStatus', () => {
	describe('When waitTill is not set', () => {
		test.each(['canceled', 'crashed', 'error', 'success'])('should return "%s"', (status) => {
			const runData = { status, data: {} } as IRun;
			expect(determineFinalExecutionStatus(runData)).toBe(status);
		});
	});

	it('should return "error" when resultData.error exists', () => {
		const runData = {
			status: 'running',
			data: {
				resultData: {
					error: new NodeOperationError(mock(), 'An error occurred'),
				},
			},
		} as IRun;

		expect(determineFinalExecutionStatus(runData)).toBe('error');
	});

	it('should return "waiting" when waitTill is defined', () => {
		const runData = {
			status: 'running',
			data: {},
			waitTill: new Date('2022-01-01T00:00:00'),
		} as IRun;

		expect(determineFinalExecutionStatus(runData)).toBe('waiting');
	});
});

describe('updateExistingExecution', () => {
	const executionPersistence = mockInstance(ExecutionPersistence);

	beforeEach(() => vi.clearAllMocks());

	it('should forward conditions to the persistence layer', async () => {
		executionPersistence.updateExistingExecution.mockResolvedValue(true);

		await updateExistingExecution({
			executionId: 'exec-1',
			workflowId: 'wf-1',
			executionData: { finished: true },
			conditions: { requireNotCanceled: true },
		});

		expect(executionPersistence.updateExistingExecution).toHaveBeenCalledWith(
			'exec-1',
			{ finished: true },
			{ requireNotCanceled: true },
		);
	});

	it('should skip the retry-success write when the conditional update is not applied', async () => {
		// e.g. a canceled execution: the guarded update returns false, so nothing else is written.
		executionPersistence.updateExistingExecution.mockResolvedValue(false);

		await updateExistingExecution({
			executionId: 'exec-1',
			workflowId: 'wf-1',
			executionData: { finished: true, retryOf: 'original-1' },
			conditions: { requireNotCanceled: true },
		});

		expect(executionPersistence.updateExistingExecution).toHaveBeenCalledTimes(1);
	});

	it('should record retrySuccessId when a retried execution finishes', async () => {
		executionPersistence.updateExistingExecution.mockResolvedValue(true);

		await updateExistingExecution({
			executionId: 'exec-2',
			workflowId: 'wf-1',
			executionData: { finished: false, status: 'success', retryOf: 'original-2' },
		});

		expect(executionPersistence.updateExistingExecution).toHaveBeenCalledWith('original-2', {
			retrySuccessId: 'exec-2',
		});
	});

	it('does not mark an unsuccessful retry as successful when finished is true', async () => {
		executionPersistence.updateExistingExecution.mockResolvedValue(true);

		await updateExistingExecution({
			executionId: 'exec-3',
			workflowId: 'wf-1',
			executionData: { finished: true, status: 'error', retryOf: 'original-3' },
		});

		expect(executionPersistence.updateExistingExecution).toHaveBeenCalledTimes(1);
	});
});

describe('prepareExecutionDataForDbUpdate', () => {
	it.each(['success', 'error', 'crashed', 'canceled', 'waiting'] as const)(
		'derives the legacy finished column from %s status',
		(workflowStatusFinal) => {
			const result = prepareExecutionDataForDbUpdate({
				runData: mock<IRun>({ finished: workflowStatusFinal !== 'success' }),
				workflowData: mock<IWorkflowBase>({ id: 'wf-1' }),
				workflowStatusFinal,
			});

			expect(result.finished).toBe(workflowStatusFinal === 'success');
		},
	);
});
