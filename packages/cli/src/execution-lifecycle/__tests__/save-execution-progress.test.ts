import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { IExecutionResponse } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { ErrorReporter } from 'n8n-core';
import type { IRunExecutionData, ITaskData } from 'n8n-workflow';

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
	const runExecutionData = mock<IRunExecutionData>();

	const commonArgs = [workflowId, executionId, nodeName, taskData, runExecutionData] as const;

	test('should not try to update non-existent executions', async () => {
		executionRepository.findSingleExecution.mockResolvedValue(undefined);

		await saveExecutionProgress(...commonArgs);
		expect(executionRepository.updateExistingExecution).not.toHaveBeenCalled();
	});

	test('should handle DB errors on execution lookup', async () => {
		const error = new Error('Something went wrong');
		executionRepository.findSingleExecution.mockImplementation(() => {
			throw error;
		});

		await saveExecutionProgress(...commonArgs);

		expect(executionRepository.updateExistingExecution).not.toHaveBeenCalled();
		expect(errorReporter.error).toHaveBeenCalledWith(error);
	});

	test('should handle DB errors when updating the execution', async () => {
		const error = new Error('Something went wrong');
		executionRepository.findSingleExecution.mockResolvedValue({} as IExecutionResponse);
		executionRepository.updateExistingExecution.mockImplementation(() => {
			throw error;
		});

		await saveExecutionProgress(...commonArgs);

		expect(executionRepository.findSingleExecution).toHaveBeenCalled();
		expect(executionRepository.updateExistingExecution).toHaveBeenCalled();
		expect(errorReporter.error).toHaveBeenCalledWith(error);
	});

	test('should not try to update finished executions', async () => {
		executionRepository.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({
				finished: true,
			}),
		);

		await saveExecutionProgress(...commonArgs);

		expect(executionRepository.updateExistingExecution).not.toHaveBeenCalled();
	});

	test('should populate `.data` when it is missing', async () => {
		const fullExecutionData = {} as IExecutionResponse;
		executionRepository.findSingleExecution.mockResolvedValue(fullExecutionData);

		await saveExecutionProgress(...commonArgs);

		expect(fullExecutionData).toEqual({
			data: {
				executionData: runExecutionData.executionData,
				resultData: {
					lastNodeExecuted: nodeName,
					runData: {
						[nodeName]: [taskData],
					},
				},
				startData: {},
			},
			status: 'running',
		});

		expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith(
			executionId,
			fullExecutionData,
		);

		expect(errorReporter.error).not.toHaveBeenCalled();
	});

	test('should augment `.data` if it already exists', async () => {
		const fullExecutionData = {
			data: {
				startData: {},
				resultData: {
					runData: {
						[nodeName]: [{}],
					},
				},
			},
		} as unknown as IExecutionResponse;
		executionRepository.findSingleExecution.mockResolvedValue(fullExecutionData);

		await saveExecutionProgress(...commonArgs);

		expect(fullExecutionData).toEqual({
			data: {
				executionData: runExecutionData.executionData,
				resultData: {
					lastNodeExecuted: nodeName,
					runData: {
						[nodeName]: [{}, taskData],
					},
				},
				startData: {},
			},
			status: 'running',
		});

		expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith(
			executionId,
			fullExecutionData,
		);
	});

	test('should set last executed node correctly', async () => {
		const fullExecutionData = {
			data: {
				resultData: {
					lastNodeExecuted: 'Another Node',
					runData: {},
				},
			},
		} as unknown as IExecutionResponse;
		executionRepository.findSingleExecution.mockResolvedValue(fullExecutionData);

		await saveExecutionProgress(...commonArgs);

		expect(fullExecutionData.data.resultData.lastNodeExecuted).toEqual(nodeName);
	});
});
