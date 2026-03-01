import { NodeVM } from 'vm2';
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { MockProxy } from 'jest-mock-extended';
import { anyNumber, mock } from 'jest-mock-extended';
import { normalizeItems } from 'n8n-core';
import type { IExecuteFunctions, INode, IWorkflowDataProxyData } from 'n8n-workflow';
import { ApplicationError } from '@n8n/errors';

import { Code } from '../Code.node';
import { PythonTaskRunnerSandbox } from '../PythonTaskRunnerSandbox';
import { ValidationError } from '../ValidationError';

describe('Test Code Node', () => {
	new NodeTestHarness().setupTests();
});

describe('Code Node unit test', () => {
	const node = new Code();
	const thisArg = mock<IExecuteFunctions>({
		getNode: () => mock(),
		helpers: { normalizeItems },
	});
	const workflowDataProxy = mock<IWorkflowDataProxyData>({ $input: mock() });
	thisArg.getWorkflowDataProxy.mockReturnValue(workflowDataProxy);

	describe('runOnceForAllItems', () => {
		beforeEach(() => {
			thisArg.getNodeParameter.calledWith('mode', 0).mockReturnValueOnce('runOnceForAllItems');
		});

		describe('valid return data', () => {
			const tests: Record<string, [object | null, object]> = {
				'should handle null': [null, []],
				'should handle pre-normalized result': [
					[{ json: { count: 42 } }],
					[{ json: { count: 42 } }],
				],

				// temporarily allowed until refactored out
				'should handle an index key': [
					[{ json: { count: 42 }, index: 0 }],
					[{ json: { count: 42 }, index: 0 }],
				],

				'should handle when returned data is not an array': [
					{ json: { count: 42 } },
					[{ json: { count: 42 } }],
				],
				'should handle when returned data is an array with items missing `json` key': [
					[{ count: 42 }],
					[{ json: { count: 42 } }],
				],
				'should handle when returned data missing `json` key': [
					{ count: 42 },
					[{ json: { count: 42 } }],
				],
			};

			Object.entries(tests).forEach(([title, [input, expected]]) =>
				test(title, async () => {
					jest.spyOn(NodeVM.prototype, 'run').mockResolvedValueOnce(input);

					const output = await node.execute.call(thisArg);

					expect([...output]).toEqual([expected]);
				}),
			);
		});

		describe('invalid return data', () => {
			const tests = {
				undefined,
				null: null,
				date: new Date(),
				string: 'string',
				boolean: true,
				array: [],
			};

			Object.entries(tests).forEach(([title, returnData]) =>
				test(`return error if \`.json\` is ${title}`, async () => {
					jest.spyOn(NodeVM.prototype, 'run').mockResolvedValueOnce([{ json: returnData }]);

					try {
						await node.execute.call(thisArg);
						throw new ApplicationError("Validation error wasn't thrown", { level: 'warning' });
					} catch (error) {
						expect(error).toBeInstanceOf(ValidationError);
						expect(error.message).toEqual("A 'json' property isn't an object [item 0]");
					}
				}),
			);
		});
	});

	describe('runOnceForEachItem', () => {
		beforeEach(() => {
			thisArg.getNodeParameter.calledWith('mode', 0).mockReturnValueOnce('runOnceForEachItem');
			thisArg.getNodeParameter.calledWith('jsCode', anyNumber()).mockReturnValueOnce('');
			thisArg.getInputData.mockReturnValueOnce([{ json: {} }]);
		});

		describe('valid return data', () => {
			const tests: Record<string, [object | null, { json: any } | null]> = {
				'should handle pre-normalized result': [{ json: { count: 42 } }, { json: { count: 42 } }],
				'should handle when returned data missing `json` key': [
					{ count: 42 },
					{ json: { count: 42 } },
				],
			};

			Object.entries(tests).forEach(([title, [input, expected]]) =>
				test(title, async () => {
					jest.spyOn(NodeVM.prototype, 'run').mockResolvedValueOnce(input);

					const output = await node.execute.call(thisArg);
					expect([...output]).toEqual([[{ json: expected?.json, pairedItem: { item: 0 } }]]);
				}),
			);
		});

		describe('invalid return data', () => {
			const tests = {
				undefined,
				null: null,
				date: new Date(),
				string: 'string',
				boolean: true,
				array: [],
			};

			Object.entries(tests).forEach(([title, returnData]) =>
				test(`return error if \`.json\` is ${title}`, async () => {
					jest.spyOn(NodeVM.prototype, 'run').mockResolvedValueOnce({ json: returnData });

					try {
						await node.execute.call(thisArg);
						throw new ApplicationError("Validation error wasn't thrown", { level: 'warning' });
					} catch (error) {
						expect(error).toBeInstanceOf(ValidationError);
						expect(error.message).toEqual("A 'json' property isn't an object [item 0]");
					}
				}),
			);
		});
	});

	describe('python language routing', () => {
		it('should route legacy `python` language to native Python runner', async () => {
			const pythonThisArg: MockProxy<IExecuteFunctions> = mock<IExecuteFunctions>();
			pythonThisArg.helpers = { normalizeItems } as IExecuteFunctions['helpers'];
			pythonThisArg.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
			pythonThisArg.getWorkflowDataProxy.mockReturnValue(workflowDataProxy);
			pythonThisArg.getMode.mockReturnValue('manual');
			pythonThisArg.getRunnerStatus.mockReturnValue({ available: true });
			pythonThisArg.getNodeParameter.calledWith('language', 0).mockReturnValue('python');
			pythonThisArg.getNodeParameter.calledWith('mode', 0).mockReturnValue('runOnceForAllItems');
			pythonThisArg.getNodeParameter.calledWith('pythonCode', 0).mockReturnValue('return []');
			pythonThisArg.getInputData.mockReturnValue([{ json: {} }]);

			const runSpy = jest
				.spyOn(PythonTaskRunnerSandbox.prototype, 'runUsingIncomingItems')
				.mockResolvedValue([]);

			await node.execute.call(pythonThisArg);

			expect(runSpy).toHaveBeenCalled();

			runSpy.mockRestore();
		});
	});
});
