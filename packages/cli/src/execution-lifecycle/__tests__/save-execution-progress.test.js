'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const save_execution_progress_1 = require('../save-execution-progress');
describe('saveExecutionProgress', () => {
	(0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
	const errorReporter = (0, backend_test_utils_1.mockInstance)(n8n_core_1.ErrorReporter);
	const executionRepository = (0, backend_test_utils_1.mockInstance)(db_1.ExecutionRepository);
	afterEach(() => {
		jest.resetAllMocks();
	});
	const workflowId = 'some-workflow-id';
	const executionId = 'some-execution-id';
	const nodeName = 'My Node';
	const taskData = (0, jest_mock_extended_1.mock)();
	const runExecutionData = (0, jest_mock_extended_1.mock)();
	const commonArgs = [workflowId, executionId, nodeName, taskData, runExecutionData];
	test('should not try to update non-existent executions', async () => {
		executionRepository.findSingleExecution.mockResolvedValue(undefined);
		await (0, save_execution_progress_1.saveExecutionProgress)(...commonArgs);
		expect(executionRepository.updateExistingExecution).not.toHaveBeenCalled();
	});
	test('should handle DB errors on execution lookup', async () => {
		const error = new Error('Something went wrong');
		executionRepository.findSingleExecution.mockImplementation(() => {
			throw error;
		});
		await (0, save_execution_progress_1.saveExecutionProgress)(...commonArgs);
		expect(executionRepository.updateExistingExecution).not.toHaveBeenCalled();
		expect(errorReporter.error).toHaveBeenCalledWith(error);
	});
	test('should handle DB errors when updating the execution', async () => {
		const error = new Error('Something went wrong');
		executionRepository.findSingleExecution.mockResolvedValue({});
		executionRepository.updateExistingExecution.mockImplementation(() => {
			throw error;
		});
		await (0, save_execution_progress_1.saveExecutionProgress)(...commonArgs);
		expect(executionRepository.findSingleExecution).toHaveBeenCalled();
		expect(executionRepository.updateExistingExecution).toHaveBeenCalled();
		expect(errorReporter.error).toHaveBeenCalledWith(error);
	});
	test('should not try to update finished executions', async () => {
		executionRepository.findSingleExecution.mockResolvedValue(
			(0, jest_mock_extended_1.mock)({
				finished: true,
			}),
		);
		await (0, save_execution_progress_1.saveExecutionProgress)(...commonArgs);
		expect(executionRepository.updateExistingExecution).not.toHaveBeenCalled();
	});
	test('should populate `.data` when it is missing', async () => {
		const fullExecutionData = {};
		executionRepository.findSingleExecution.mockResolvedValue(fullExecutionData);
		await (0, save_execution_progress_1.saveExecutionProgress)(...commonArgs);
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
		};
		executionRepository.findSingleExecution.mockResolvedValue(fullExecutionData);
		await (0, save_execution_progress_1.saveExecutionProgress)(...commonArgs);
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
		};
		executionRepository.findSingleExecution.mockResolvedValue(fullExecutionData);
		await (0, save_execution_progress_1.saveExecutionProgress)(...commonArgs);
		expect(fullExecutionData.data.resultData.lastNodeExecuted).toEqual(nodeName);
	});
});
//# sourceMappingURL=save-execution-progress.test.js.map
