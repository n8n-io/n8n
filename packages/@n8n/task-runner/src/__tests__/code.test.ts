import type { CodeExecutionMode, IDataObject, WorkflowExecuteMode } from 'n8n-workflow';

import { JsTaskRunner, type AllCodeTaskData, type JSExecSettings } from '@/code';
import type { Task } from '@/task-runner';
import { ValidationError } from '@/validation-error';

import { newAllCodeTaskData, newTaskWithSettings, withPairedItem, wrapIntoJson } from './test-data';

jest.mock('ws');

describe('JsTaskRunner', () => {
	const jsTaskRunner = new JsTaskRunner('taskType', 'ws://localhost', 'grantToken', 1);

	const execTaskWithParams = async ({
		task,
		taskData,
	}: {
		task: Task<JSExecSettings>;
		taskData: AllCodeTaskData;
	}) => {
		jest.spyOn(jsTaskRunner, 'requestData').mockResolvedValue(taskData);
		return await jsTaskRunner.executeTask(task);
	};

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('console', () => {
		test.each<[CodeExecutionMode, WorkflowExecuteMode]>([
			['runOnceForAllItems', 'cli'],
			['runOnceForAllItems', 'error'],
			['runOnceForAllItems', 'integrated'],
			['runOnceForAllItems', 'internal'],
			['runOnceForAllItems', 'retry'],
			['runOnceForAllItems', 'trigger'],
			['runOnceForAllItems', 'webhook'],
			['runOnceForEachItem', 'cli'],
			['runOnceForEachItem', 'error'],
			['runOnceForEachItem', 'integrated'],
			['runOnceForEachItem', 'internal'],
			['runOnceForEachItem', 'retry'],
			['runOnceForEachItem', 'trigger'],
			['runOnceForEachItem', 'webhook'],
		])(
			'should make an rpc call for console log in %s mode when workflow mode is %s',
			async (nodeMode, workflowMode) => {
				jest.spyOn(console, 'log').mockImplementation(() => {});
				jest.spyOn(jsTaskRunner, 'makeRpcCall').mockResolvedValue(undefined);
				const task = newTaskWithSettings({
					code: "console.log('Hello', 'world!'); return {}",
					nodeMode,
					workflowMode,
				});

				await execTaskWithParams({
					task,
					taskData: newAllCodeTaskData([wrapIntoJson({})]),
				});

				expect(console.log).toHaveBeenCalledWith('[JS Code]', 'Hello world!');
				expect(jsTaskRunner.makeRpcCall).toHaveBeenCalledWith(task.taskId, 'logNodeOutput', [
					'Hello world!',
				]);
			},
		);

		test.each<[CodeExecutionMode, WorkflowExecuteMode]>([
			['runOnceForAllItems', 'manual'],
			['runOnceForEachItem', 'manual'],
		])(
			"shouldn't make an rpc call for console log in %s mode when workflow mode is %s",
			async (nodeMode, workflowMode) => {
				jest.spyOn(jsTaskRunner, 'makeRpcCall').mockResolvedValue(undefined);
				const task = newTaskWithSettings({
					code: "console.log('Hello', 'world!'); return {}",
					nodeMode,
					workflowMode,
				});

				await execTaskWithParams({
					task,
					taskData: newAllCodeTaskData([wrapIntoJson({})]),
				});

				expect(jsTaskRunner.makeRpcCall).not.toHaveBeenCalled();
			},
		);
	});

	describe('runOnceForAllItems', () => {
		const executeForAllItems = async ({
			code,
			inputItems,
			settings,
		}: { code: string; inputItems: IDataObject[]; settings?: Partial<JSExecSettings> }) => {
			return await execTaskWithParams({
				task: newTaskWithSettings({
					code,
					nodeMode: 'runOnceForAllItems',
					...settings,
				}),
				taskData: newAllCodeTaskData(inputItems.map(wrapIntoJson)),
			});
		};

		describe('continue on fail', () => {
			it('should return an item with the error if continueOnFail is true', async () => {
				const outcome = await executeForAllItems({
					code: 'throw new Error("Error message")',
					inputItems: [{ a: 1 }],
					settings: { continueOnFail: true },
				});

				expect(outcome).toEqual({
					result: [wrapIntoJson({ error: 'Error message' })],
					customData: undefined,
				});
			});

			it('should throw an error if continueOnFail is false', async () => {
				await expect(
					executeForAllItems({
						code: 'throw new Error("Error message")',
						inputItems: [{ a: 1 }],
						settings: { continueOnFail: false },
					}),
				).rejects.toThrow('Error message');
			});
		});

		describe('invalid output', () => {
			test.each([['undefined'], ['42'], ['"a string"']])(
				'should throw a ValidationError if the code output is %s',
				async (output) => {
					await expect(
						executeForAllItems({
							code: `return ${output}`,
							inputItems: [{ a: 1 }],
						}),
					).rejects.toThrow(ValidationError);
				},
			);

			it('should throw a ValidationError if some items are wrapped in json and some are not', async () => {
				await expect(
					executeForAllItems({
						code: 'return [{b: 1}, {json: {b: 2}}]',
						inputItems: [{ a: 1 }],
					}),
				).rejects.toThrow(ValidationError);
			});
		});

		it('should return static items', async () => {
			const outcome = await executeForAllItems({
				code: 'return [{json: {b: 1}}]',
				inputItems: [{ a: 1 }],
			});

			expect(outcome).toEqual({
				result: [wrapIntoJson({ b: 1 })],
				customData: undefined,
			});
		});

		it('maps null into an empty array', async () => {
			const outcome = await executeForAllItems({
				code: 'return null',
				inputItems: [{ a: 1 }],
			});

			expect(outcome).toEqual({
				result: [],
				customData: undefined,
			});
		});

		it("should wrap items into json if they aren't", async () => {
			const outcome = await executeForAllItems({
				code: 'return [{b: 1}]',
				inputItems: [{ a: 1 }],
			});

			expect(outcome).toEqual({
				result: [wrapIntoJson({ b: 1 })],
				customData: undefined,
			});
		});

		it('should wrap single item into an array and json', async () => {
			const outcome = await executeForAllItems({
				code: 'return {b: 1}',
				inputItems: [{ a: 1 }],
			});

			expect(outcome).toEqual({
				result: [wrapIntoJson({ b: 1 })],
				customData: undefined,
			});
		});

		test.each([['items'], ['$input.all()'], ["$('Trigger').all()"]])(
			'should have all input items in the context as %s',
			async (expression) => {
				const outcome = await executeForAllItems({
					code: `return ${expression}`,
					inputItems: [{ a: 1 }, { a: 2 }],
				});

				expect(outcome).toEqual({
					result: [wrapIntoJson({ a: 1 }), wrapIntoJson({ a: 2 })],
					customData: undefined,
				});
			},
		);
	});

	describe('runForEachItem', () => {
		const executeForEachItem = async ({
			code,
			inputItems,
			settings,
		}: { code: string; inputItems: IDataObject[]; settings?: Partial<JSExecSettings> }) => {
			return await execTaskWithParams({
				task: newTaskWithSettings({
					code,
					nodeMode: 'runOnceForEachItem',
					...settings,
				}),
				taskData: newAllCodeTaskData(inputItems.map(wrapIntoJson)),
			});
		};

		describe('continue on fail', () => {
			it('should return an item with the error if continueOnFail is true', async () => {
				const outcome = await executeForEachItem({
					code: 'throw new Error("Error message")',
					inputItems: [{ a: 1 }, { a: 2 }],
					settings: { continueOnFail: true },
				});

				expect(outcome).toEqual({
					result: [
						withPairedItem(0, wrapIntoJson({ error: 'Error message' })),
						withPairedItem(1, wrapIntoJson({ error: 'Error message' })),
					],
					customData: undefined,
				});
			});

			it('should throw an error if continueOnFail is false', async () => {
				await expect(
					executeForEachItem({
						code: 'throw new Error("Error message")',
						inputItems: [{ a: 1 }],
						settings: { continueOnFail: false },
					}),
				).rejects.toThrow('Error message');
			});
		});

		describe('invalid output', () => {
			test.each([['undefined'], ['42'], ['"a string"'], ['[]'], ['[1,2,3]']])(
				'should throw a ValidationError if the code output is %s',
				async (output) => {
					await expect(
						executeForEachItem({
							code: `return ${output}`,
							inputItems: [{ a: 1 }],
						}),
					).rejects.toThrow(ValidationError);
				},
			);
		});

		it('should return static items', async () => {
			const outcome = await executeForEachItem({
				code: 'return {json: {b: 1}}',
				inputItems: [{ a: 1 }],
			});

			expect(outcome).toEqual({
				result: [withPairedItem(0, wrapIntoJson({ b: 1 }))],
				customData: undefined,
			});
		});

		it('should filter out null values', async () => {
			const outcome = await executeForEachItem({
				code: 'return item.json.a === 1 ? item : null',
				inputItems: [{ a: 1 }, { a: 2 }, { a: 3 }],
			});

			expect(outcome).toEqual({
				result: [withPairedItem(0, wrapIntoJson({ a: 1 }))],
				customData: undefined,
			});
		});

		test.each([['item'], ['$input.item'], ['{ json: $json }']])(
			'should have the current input item in the context as %s',
			async (expression) => {
				const outcome = await executeForEachItem({
					code: `return ${expression}`,
					inputItems: [{ a: 1 }, { a: 2 }],
				});

				expect(outcome).toEqual({
					result: [
						withPairedItem(0, wrapIntoJson({ a: 1 })),
						withPairedItem(1, wrapIntoJson({ a: 2 })),
					],
					customData: undefined,
				});
			},
		);
	});
});
