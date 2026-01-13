import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { createResultOk, createResultError, NodeOperationError } from 'n8n-workflow';

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

		it('should throw NodeOperationError when pythonCode is undefined', async () => {
			const nodeMode = 'runOnceForAllItems';
			const workflowMode = 'manual';
			const executeFunctions = createMockExecuteFunctions([]);

			const sandbox = new PythonTaskRunnerSandbox(
				undefined as unknown as string,
				nodeMode,
				workflowMode,
				executeFunctions,
			);

			await expect(sandbox.runUsingIncomingItems()).rejects.toThrow(NodeOperationError);
			await expect(sandbox.runUsingIncomingItems()).rejects.toThrow(
				'No Python code found to execute',
			);
			expect(executeFunctions.startJob).not.toHaveBeenCalled();
		});
	});

	describe('runCodeForTool', () => {
		it('should pass query and empty items to the runner', async () => {
			const pythonCode = 'return _query.upper()';
			const nodeMode = 'runOnceForAllItems';
			const workflowMode = 'manual';
			const executeFunctions = createMockExecuteFunctions([]);
			const query = 'hello world';

			const sandbox = new PythonTaskRunnerSandbox(
				pythonCode,
				nodeMode,
				workflowMode,
				executeFunctions,
				{ query },
			);

			executeFunctions.startJob.mockResolvedValue(createResultOk('HELLO WORLD'));

			const result = await sandbox.runCodeForTool();

			expect(executeFunctions.startJob).toHaveBeenCalledTimes(1);
			expect(executeFunctions.startJob).toHaveBeenCalledWith(
				'python',
				{
					code: pythonCode,
					nodeMode: 'runOnceForAllItems',
					workflowMode,
					continueOnFail: executeFunctions.continueOnFail(),
					items: [],
					nodeId: 'node-id',
					nodeName: 'Code',
					workflowId: 'workflow-id',
					workflowName: 'Test Workflow',
					query,
				},
				0,
			);
			expect(result).toBe('HELLO WORLD');
		});

		it('should pass structured query object to the runner', async () => {
			const pythonCode = 'return f"{_query["name"]} is {_query["age"]}"';
			const nodeMode = 'runOnceForAllItems';
			const workflowMode = 'manual';
			const executeFunctions = createMockExecuteFunctions([]);
			const query = { name: 'Alice', age: 30 };

			const sandbox = new PythonTaskRunnerSandbox(
				pythonCode,
				nodeMode,
				workflowMode,
				executeFunctions,
				{ query },
			);

			executeFunctions.startJob.mockResolvedValue(createResultOk('Alice is 30'));

			const result = await sandbox.runCodeForTool();

			expect(executeFunctions.startJob).toHaveBeenCalledWith(
				'python',
				expect.objectContaining({ query, items: [] }),
				0,
			);
			expect(result).toBe('Alice is 30');
		});

		it('should return result without validation', async () => {
			const pythonCode = 'return 42';
			const nodeMode = 'runOnceForAllItems';
			const workflowMode = 'manual';
			const executeFunctions = createMockExecuteFunctions([]);

			const sandbox = new PythonTaskRunnerSandbox(
				pythonCode,
				nodeMode,
				workflowMode,
				executeFunctions,
				{ query: 'test' },
			);

			executeFunctions.startJob.mockResolvedValue(createResultOk(42));

			const result = await sandbox.runCodeForTool();

			// Should return raw number, not wrapped in INodeExecutionData
			expect(result).toBe(42);
			expect(executeFunctions.helpers.normalizeItems).not.toHaveBeenCalled();
		});

		it('should handle execution errors by calling throwExecutionError', async () => {
			const pythonCode = 'raise ValueError("tool error")';
			const nodeMode = 'runOnceForAllItems';
			const workflowMode = 'manual';
			const executeFunctions = createMockExecuteFunctions([]);

			const sandbox = new PythonTaskRunnerSandbox(
				pythonCode,
				nodeMode,
				workflowMode,
				executeFunctions,
				{ query: 'test' },
			);

			const executionError = { message: 'tool error', stack: 'error stack' };
			executeFunctions.startJob.mockResolvedValue(createResultError(executionError));

			const throwExecutionErrorModule = await import('../throw-execution-error');
			const throwExecutionErrorSpy = jest
				.spyOn(throwExecutionErrorModule, 'throwExecutionError')
				.mockImplementation(() => {
					throw new Error('Tool execution failed');
				});

			await expect(sandbox.runCodeForTool()).rejects.toThrow('Tool execution failed');
			expect(throwExecutionErrorSpy).toHaveBeenCalledWith(executionError);
		});

		it('should throw NodeOperationError when pythonCode is undefined', async () => {
			const nodeMode = 'runOnceForAllItems';
			const workflowMode = 'manual';
			const executeFunctions = createMockExecuteFunctions([]);

			const sandbox = new PythonTaskRunnerSandbox(
				undefined as unknown as string,
				nodeMode,
				workflowMode,
				executeFunctions,
				{ query: 'test' },
			);

			await expect(sandbox.runCodeForTool()).rejects.toThrow(NodeOperationError);
			await expect(sandbox.runCodeForTool()).rejects.toThrow('No Python code found to execute');
			expect(executeFunctions.startJob).not.toHaveBeenCalled();
		});
	});
});
