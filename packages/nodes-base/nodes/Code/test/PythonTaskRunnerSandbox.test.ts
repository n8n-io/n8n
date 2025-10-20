import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { createResultOk, createResultError } from 'n8n-workflow';

import { PythonTaskRunnerSandbox } from '../PythonTaskRunnerSandbox';

const createNormalizeItemsMock = () =>
	jest.fn().mockImplementation((items: any) => {
		const itemsArray = Array.isArray(items) ? items : [items];
		return itemsArray.map((item: any) => {
			if (item.json !== undefined) {
				return item;
			}
			return { json: item };
		});
	});

const createMockExecuteFunctions = (inputData: any[] = []) => {
	const executeFunctions = mock<IExecuteFunctions>();
	executeFunctions.helpers = {
		...executeFunctions.helpers,
		normalizeItems: createNormalizeItemsMock(),
	};
	executeFunctions.getNode.mockReturnValue({
		id: 'node-id',
		name: 'Code',
		type: 'n8n-nodes-base.code',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	});
	executeFunctions.getWorkflow.mockReturnValue({
		id: 'workflow-id',
		name: 'Test Workflow',
		active: false,
	});
	executeFunctions.getInputData.mockReturnValue(inputData);
	return executeFunctions;
};

describe('PythonTaskRunnerSandbox', () => {
	describe('runUsingIncomingItems', () => {
		it('should call validateRunCodeAllItems for runOnceForAllItems mode', async () => {
			const pythonCode = 'return [{"foo": "bar"}]';
			const nodeMode = 'runOnceForAllItems';
			const workflowMode = 'manual';
			const executeFunctions = createMockExecuteFunctions([{ json: { test: 'data' } }]);

			const sandbox = new PythonTaskRunnerSandbox(
				pythonCode,
				nodeMode,
				workflowMode,
				executeFunctions,
			);

			const mockResult = [{ foo: 'bar' }];
			executeFunctions.startJob.mockResolvedValue(createResultOk(mockResult));

			const result = await sandbox.runUsingIncomingItems();

			expect(executeFunctions.startJob).toHaveBeenCalledTimes(1);
			expect(executeFunctions.startJob).toHaveBeenCalledWith(
				'python',
				{
					code: pythonCode,
					nodeMode,
					workflowMode,
					continueOnFail: executeFunctions.continueOnFail(),
					items: [{ json: { test: 'data' } }],
					nodeId: 'node-id',
					nodeName: 'Code',
					workflowId: 'workflow-id',
					workflowName: 'Test Workflow',
				},
				0,
			);
			expect(executeFunctions.helpers.normalizeItems).toHaveBeenCalledWith(mockResult);
			expect(result).toEqual([{ json: { foo: 'bar' } }]);
		});

		it('should call validateRunCodeEachItem for runOnceForEachItem mode', async () => {
			const pythonCode = 'return {"foo": "bar"}';
			const nodeMode = 'runOnceForEachItem';
			const workflowMode = 'manual';
			const executeFunctions = createMockExecuteFunctions([
				{ json: { test: 'data1' } },
				{ json: { test: 'data2' } },
			]);

			const sandbox = new PythonTaskRunnerSandbox(
				pythonCode,
				nodeMode,
				workflowMode,
				executeFunctions,
			);

			const mockResult = [
				{ json: { foo: 'bar' }, pairedItem: { item: 0 } },
				{ json: { foo: 'bar' }, pairedItem: { item: 1 } },
			];
			executeFunctions.startJob.mockResolvedValue(createResultOk(mockResult));

			const result = await sandbox.runUsingIncomingItems();

			expect(executeFunctions.startJob).toHaveBeenCalledTimes(1);
			expect(executeFunctions.helpers.normalizeItems).toHaveBeenCalledTimes(2);
			expect(result).toHaveLength(2);
			expect(result[0]).toHaveProperty('json');
			expect(result[0]).toHaveProperty('pairedItem');
		});

		it('should handle execution errors by calling throwExecutionError', async () => {
			const pythonCode = 'raise ValueError("test error")';
			const nodeMode = 'runOnceForAllItems';
			const workflowMode = 'manual';
			const executeFunctions = createMockExecuteFunctions([]);

			const sandbox = new PythonTaskRunnerSandbox(
				pythonCode,
				nodeMode,
				workflowMode,
				executeFunctions,
			);

			const executionError = { message: 'test error', stack: 'error stack' };
			executeFunctions.startJob.mockResolvedValue(createResultError(executionError));

			const throwExecutionErrorModule = await import('../throw-execution-error');
			const throwExecutionErrorSpy = jest
				.spyOn(throwExecutionErrorModule, 'throwExecutionError')
				.mockImplementation(() => {
					throw new Error('Execution failed');
				});

			await expect(sandbox.runUsingIncomingItems()).rejects.toThrow('Execution failed');
			expect(throwExecutionErrorSpy).toHaveBeenCalledWith(executionError);
		});
	});
});
