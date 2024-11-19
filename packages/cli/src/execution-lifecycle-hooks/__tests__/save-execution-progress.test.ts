import {
	ErrorReporterProxy,
	type IRunExecutionData,
	type ITaskData,
	type IWorkflowBase,
} from 'n8n-workflow';

import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { saveExecutionProgress } from '@/execution-lifecycle-hooks/save-execution-progress';
import * as fnModule from '@/execution-lifecycle-hooks/to-save-settings';
import type { IExecutionResponse } from '@/interfaces';
import { Logger } from '@/logging/logger.service';
import { mockInstance } from '@test/mocking';

mockInstance(Logger);

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

	const reporterSpy = jest.spyOn(ErrorReporterProxy, 'error');

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

	expect(reporterSpy).not.toHaveBeenCalled();
});

test('should report error on failure', async () => {
	jest.spyOn(fnModule, 'toSaveSettings').mockReturnValue({
		...commonSettings,
		progress: true,
	});

	const reporterSpy = jest.spyOn(ErrorReporterProxy, 'error');

	const error = new Error('Something went wrong');

	executionRepository.findSingleExecution.mockImplementation(() => {
		throw error;
	});

	await saveExecutionProgress(...commonArgs);

	expect(executionRepository.updateExistingExecution).not.toHaveBeenCalled();
	expect(reporterSpy).toHaveBeenCalledWith(error);
});
