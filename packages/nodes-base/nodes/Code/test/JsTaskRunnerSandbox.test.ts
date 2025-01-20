import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { createResultOk } from 'n8n-workflow';

import { JsTaskRunnerSandbox } from '../JsTaskRunnerSandbox';

describe('JsTaskRunnerSandbox', () => {
	describe('runCodeForEachItem', () => {
		it('should chunk the input items and execute the code for each chunk', async () => {
			const jsCode = 'console.log($item);';
			const nodeMode = 'runOnceForEachItem';
			const workflowMode = 'manual';
			const executeFunctions = mock<IExecuteFunctions>();
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
					},
					0,
				],
			]);
		});
	});
});
