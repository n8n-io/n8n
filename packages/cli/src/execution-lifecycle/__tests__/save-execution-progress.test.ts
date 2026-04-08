import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { ExecutionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { ErrorReporter } from 'n8n-core';
import { createRunExecutionData, type ITaskData } from 'n8n-workflow';

import { saveExecutionProgress } from '../save-execution-progress';

describe('saveExecutionProgress', () => {
	mockInstance(Logger);
	const errorReporter = mockInstance(ErrorReporter);
	const executionRepository = mockInstance(ExecutionRepository);

	afterEach(() => {
		jest.resetAllMocks();
	});

	const workflowId = 'some-workflow-id';
	const executionId = 'some-execution-id';
	const nodeName = 'My Node';
	const taskData = mock<ITaskData>();
	const runExecutionData = createRunExecutionData();

	const commonArgs = [workflowId, executionId, nodeName, taskData, runExecutionData] as const;

	test('should update execution with in-memory data and conditional WHERE', async () => {
		executionRepository.updateExistingExecution.mockResolvedValue(true);

		await saveExecutionProgress(...commonArgs);

		expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith(
			executionId,
			{ data: runExecutionData, status: 'running' },
			{ requireNotFinished: true, requireNotCanceled: true },
		);
		expect(errorReporter.error).not.toHaveBeenCalled();
	});

	test('should set lastNodeExecuted on in-memory data before saving', async () => {
		executionRepository.updateExistingExecution.mockResolvedValue(true);
		const execData = createRunExecutionData();

		await saveExecutionProgress(workflowId, executionId, nodeName, taskData, execData);

		expect(execData.resultData.lastNodeExecuted).toBe(nodeName);
	});

	test('should not throw when update returns false (execution finished or canceled)', async () => {
		executionRepository.updateExistingExecution.mockResolvedValue(false);

		await saveExecutionProgress(...commonArgs);

		expect(executionRepository.updateExistingExecution).toHaveBeenCalled();
		expect(errorReporter.error).not.toHaveBeenCalled();
	});

	test('should handle DB errors when updating the execution', async () => {
		const error = new Error('Something went wrong');
		executionRepository.updateExistingExecution.mockImplementation(() => {
			throw error;
		});

		await saveExecutionProgress(...commonArgs);

		expect(executionRepository.updateExistingExecution).toHaveBeenCalled();
		expect(errorReporter.error).toHaveBeenCalledWith(error);
	});

	test('should not fetch execution from database', async () => {
		executionRepository.updateExistingExecution.mockResolvedValue(true);

		await saveExecutionProgress(...commonArgs);

		expect(executionRepository.findSingleExecution).not.toHaveBeenCalled();
	});
});
