import { ErrorReporter } from 'n8n-core';
import { Logger } from 'n8n-core';
import type { IRunExecutionData, ITaskData, IWorkflowBase } from 'n8n-workflow';

import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { IExecutionResponse } from '@/interfaces';
import { mockInstance } from '@test/mocking';

import { saveExecutionProgress } from '../save-execution-progress';
import * as fnModule from '../to-save-settings';

mockInstance(Logger);
const errorReporter = mockInstance(ErrorReporter);
const executionRepository = mockInstance(ExecutionRepository);

afterEach(() => {
	jest.clearAllMocks();
});

const commonArgs: [IWorkflowBase, string, string, ITaskData, IRunExecutionData, string] = [
	{} as IWorkflowBase,
	'some-execution-id',
	'My Node',
	{} as ITaskData,
	{} as IRunExecutionData,
	'some-session-id',
];

const commonSettings = { error: true, success: true, manual: true };

test('should ignore if save settings say so', async () => {
	jest.spyOn(fnModule, 'toSaveSettings').mockReturnValue({
		...commonSettings,
		progress: false,
	});

	await saveExecutionProgress(...commonArgs);

	expect(executionRepository.updateExistingExecution).not.toHaveBeenCalled();
});

test('should ignore on leftover async call', async () => {
	jest.spyOn(fnModule, 'toSaveSettings').mockReturnValue({
		...commonSettings,
		progress: true,
	});

	executionRepository.findSingleExecution.mockResolvedValue({
		finished: true,
	} as IExecutionResponse);

	await saveExecutionProgress(...commonArgs);

	expect(executionRepository.updateExistingExecution).not.toHaveBeenCalled();
});

test('should update execution when saving progress is enabled', async () => {
	jest.spyOn(fnModule, 'toSaveSettings').mockReturnValue({
		...commonSettings,
		progress: true,
	});

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
	jest.spyOn(fnModule, 'toSaveSettings').mockReturnValue({
		...commonSettings,
		progress: true,
	});

	const error = new Error('Something went wrong');

	executionRepository.findSingleExecution.mockImplementation(() => {
		throw error;
	});

	await saveExecutionProgress(...commonArgs);

	expect(executionRepository.updateExistingExecution).not.toHaveBeenCalled();
	expect(errorReporter.error).toHaveBeenCalledWith(error);
});
