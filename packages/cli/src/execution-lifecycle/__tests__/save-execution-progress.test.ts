import { ErrorReporter } from 'n8n-core';
import { Logger } from 'n8n-core';
import type { IRunExecutionData, ITaskData } from 'n8n-workflow';

import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { IExecutionResponse } from '@/interfaces';
import { mockInstance } from '@test/mocking';

import { saveExecutionProgress } from '../save-execution-progress';

describe('saveExecutionProgress', () => {
	mockInstance(Logger);
	const errorReporter = mockInstance(ErrorReporter);
	const executionRepository = mockInstance(ExecutionRepository);

	afterEach(() => {
		jest.resetAllMocks();
	});

	const commonArgs: [string, string, string, ITaskData, IRunExecutionData] = [
		'some-workflow-id',
		'some-execution-id',
		'My Node',
		{} as ITaskData,
		{} as IRunExecutionData,
	];

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
		executionRepository.findSingleExecution.mockResolvedValue({
			finished: true,
		} as IExecutionResponse);

		await saveExecutionProgress(...commonArgs);

		expect(executionRepository.updateExistingExecution).not.toHaveBeenCalled();
	});

	test('should populate `.data` when it is missing', async () => {
		const fullExecutionData = {} as IExecutionResponse;
		executionRepository.findSingleExecution.mockResolvedValue(fullExecutionData);

		await saveExecutionProgress(...commonArgs);

		expect(fullExecutionData).toEqual({
			data: {
				executionData: undefined,
				resultData: {
					lastNodeExecuted: 'My Node',
					runData: {
						'My Node': [{}],
					},
				},
				startData: {},
			},
			status: 'running',
		});

		expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith(
			'some-execution-id',
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
						'My Node': [{}],
					},
				},
			},
		} as unknown as IExecutionResponse;
		executionRepository.findSingleExecution.mockResolvedValue(fullExecutionData);

		await saveExecutionProgress(...commonArgs);

		expect(fullExecutionData).toEqual({
			data: {
				executionData: undefined,
				resultData: {
					lastNodeExecuted: 'My Node',
					runData: {
						'My Node': [{}, {}],
					},
				},
				startData: {},
			},
			status: 'running',
		});

		expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith(
			'some-execution-id',
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

		expect(fullExecutionData.data.resultData.lastNodeExecuted).toEqual('My Node');
	});
});
