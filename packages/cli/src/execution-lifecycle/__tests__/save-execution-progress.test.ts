import { ErrorReporter } from 'n8n-core';
import { Logger } from 'n8n-core';
import type { IRunExecutionData, ITaskData } from 'n8n-workflow';

import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { IExecutionResponse } from '@/interfaces';
import { mockInstance } from '@test/mocking';

import { saveExecutionProgress } from '../save-execution-progress';

mockInstance(Logger);
const errorReporter = mockInstance(ErrorReporter);
const executionRepository = mockInstance(ExecutionRepository);

afterEach(() => {
	jest.clearAllMocks();
});

const commonArgs: [string, string, string, ITaskData, IRunExecutionData] = [
	'some-workflow-id',
	'some-execution-id',
	'My Node',
	{} as ITaskData,
	{} as IRunExecutionData,
];

test('should ignore on leftover async call', async () => {
	executionRepository.findSingleExecution.mockResolvedValue({
		finished: true,
	} as IExecutionResponse);

	await saveExecutionProgress(...commonArgs);

	expect(executionRepository.updateExistingExecution).not.toHaveBeenCalled();
});

test('should update execution when saving progress is enabled', async () => {
	executionRepository.findSingleExecution.mockResolvedValue({} as IExecutionResponse);

	await saveExecutionProgress(...commonArgs);

	expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith('some-execution-id', {
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

	expect(errorReporter.error).not.toHaveBeenCalled();
});

test('should report error on failure', async () => {
	const error = new Error('Something went wrong');

	executionRepository.findSingleExecution.mockImplementation(() => {
		throw error;
	});

	await saveExecutionProgress(...commonArgs);

	expect(executionRepository.updateExistingExecution).not.toHaveBeenCalled();
	expect(errorReporter.error).toHaveBeenCalledWith(error);
});
