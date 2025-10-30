import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { createResultOk, createResultError } from 'n8n-workflow';

import { JsTaskRunnerSandbox } from '../JsTaskRunnerSandbox';

describe('JsTaskRunnerSandbox', () => {
	describe('runCodeForEachItem', () => {
		it('should chunk the input items and execute the code for each chunk', async () => {
			const jsCode = 'console.log($item);';
			const nodeMode = 'runOnceForEachItem';
			const workflowMode = 'manual';
			const executeFunctions = mock<IExecuteFunctions>();
			executeFunctions.helpers = {
				...executeFunctions.helpers,
				normalizeItems: jest
					.fn()
					// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
					.mockImplementation((items: any) => (Array.isArray(items) ? items : [items])),
			};

			const sandbox = new JsTaskRunnerSandbox(jsCode, nodeMode, workflowMode, executeFunctions, 2);
			let i = 1;
			executeFunctions.startJob.mockResolvedValue(createResultOk([{ json: { item: i++ } }]));

			const numInputItems = 5;
			await sandbox.runCodeForEachItem(numInputItems);

			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(executeFunctions.startJob).toHaveBeenCalledTimes(3);
			const calls = executeFunctions.startJob.mock.calls;
			expect(calls).toEqual([
				[
					'javascript',
					{
						code: jsCode,
						nodeMode,
						workflowMode,
						continueOnFail: executeFunctions.continueOnFail(),
						chunk: { startIndex: 0, count: 2 },
						additionalProperties: {},
					},
					0,
				],
				[
					'javascript',
					{
						code: jsCode,
						nodeMode,
						workflowMode,
						continueOnFail: executeFunctions.continueOnFail(),
						chunk: { startIndex: 2, count: 2 },
						additionalProperties: {},
					},
					0,
				],
				[
					'javascript',
					{
						code: jsCode,
						nodeMode,
						workflowMode,
						continueOnFail: executeFunctions.continueOnFail(),
						chunk: { startIndex: 4, count: 1 },
						additionalProperties: {},
					},
					0,
				],
			]);
		});
	});

	describe('runCodeForTool', () => {
		it('should execute code and return string result', async () => {
			const jsCode = 'return "Hello World";';
			const nodeMode = 'runOnceForAllItems';
			const workflowMode = 'manual';
			const executeFunctions = mock<IExecuteFunctions>();
			executeFunctions.helpers = {
				...executeFunctions.helpers,
				normalizeItems: jest
					.fn()
					// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
					.mockImplementation((items: any) => (Array.isArray(items) ? items : [items])),
			};

			const sandbox = new JsTaskRunnerSandbox(jsCode, nodeMode, workflowMode, executeFunctions);

			const expectedResult = 'Hello World';
			executeFunctions.startJob.mockResolvedValue(createResultOk(expectedResult));

			const result = await sandbox.runCodeForTool();

			expect(result).toBe(expectedResult);
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(executeFunctions.startJob).toHaveBeenCalledTimes(1);
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(executeFunctions.startJob).toHaveBeenCalledWith(
				'javascript',
				{
					code: jsCode,
					nodeMode,
					workflowMode,
					continueOnFail: executeFunctions.continueOnFail(),
					additionalProperties: {},
				},
				0,
			);
		});

		it('should handle execution errors by calling throwExecutionError', async () => {
			const jsCode = 'throw new Error("execution failed");';
			const nodeMode = 'runOnceForAllItems';
			const workflowMode = 'manual';
			const executeFunctions = mock<IExecuteFunctions>();
			executeFunctions.helpers = {
				...executeFunctions.helpers,
				normalizeItems: jest
					.fn()
					// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
					.mockImplementation((items: any) => (Array.isArray(items) ? items : [items])),
			};

			const sandbox = new JsTaskRunnerSandbox(jsCode, nodeMode, workflowMode, executeFunctions);

			const executionError = { message: 'execution failed', stack: 'error stack' };
			executeFunctions.startJob.mockResolvedValue(createResultError(executionError));

			// Mock throwExecutionError to throw an error for testing
			const throwExecutionErrorModule = await import('../throw-execution-error');
			const throwExecutionErrorSpy = jest
				.spyOn(throwExecutionErrorModule, 'throwExecutionError')
				.mockImplementation(() => {
					throw new Error('Execution failed');
				});

			await expect(sandbox.runCodeForTool()).rejects.toThrow('Execution failed');
			expect(throwExecutionErrorSpy).toHaveBeenCalledWith(executionError);
		});
	});
});
