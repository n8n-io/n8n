import { DateTime } from 'luxon';
import type { CodeExecutionMode, IDataObject } from 'n8n-workflow';
import fs from 'node:fs';
import { builtinModules } from 'node:module';

import { ValidationError } from '@/js-task-runner/errors/validation-error';
import type { JsTaskRunnerOpts } from '@/js-task-runner/js-task-runner';
import {
	JsTaskRunner,
	type AllCodeTaskData,
	type JSExecSettings,
} from '@/js-task-runner/js-task-runner';
import type { Task } from '@/task-runner';

import { newAllCodeTaskData, newTaskWithSettings, withPairedItem, wrapIntoJson } from './test-data';
import { ExecutionError } from '../errors/execution-error';

jest.mock('ws');

describe('JsTaskRunner', () => {
	const createRunnerWithOpts = (opts: Partial<JsTaskRunnerOpts> = {}) =>
		new JsTaskRunner({
			wsUrl: 'ws://localhost',
			grantToken: 'grantToken',
			maxConcurrency: 1,
			...opts,
		});

	const defaultTaskRunner = createRunnerWithOpts();

	const execTaskWithParams = async ({
		task,
		taskData,
		runner = defaultTaskRunner,
	}: {
		task: Task<JSExecSettings>;
		taskData: AllCodeTaskData;
		runner?: JsTaskRunner;
	}) => {
		jest.spyOn(runner, 'requestData').mockResolvedValue(taskData);
		return await runner.executeTask(task);
	};

	afterEach(() => {
		jest.restoreAllMocks();
	});

	const executeForAllItems = async ({
		code,
		inputItems,
		settings,
		runner,
	}: {
		code: string;
		inputItems: IDataObject[];
		settings?: Partial<JSExecSettings>;
		runner?: JsTaskRunner;
	}) => {
		return await execTaskWithParams({
			task: newTaskWithSettings({
				code,
				nodeMode: 'runOnceForAllItems',
				...settings,
			}),
			taskData: newAllCodeTaskData(inputItems.map(wrapIntoJson)),
			runner,
		});
	};

	const executeForEachItem = async ({
		code,
		inputItems,
		settings,
		runner,
	}: {
		code: string;
		inputItems: IDataObject[];
		settings?: Partial<JSExecSettings>;

		runner?: JsTaskRunner;
	}) => {
		return await execTaskWithParams({
			task: newTaskWithSettings({
				code,
				nodeMode: 'runOnceForEachItem',
				...settings,
			}),
			taskData: newAllCodeTaskData(inputItems.map(wrapIntoJson)),
			runner,
		});
	};

	describe('console', () => {
		test.each<[CodeExecutionMode]>([['runOnceForAllItems'], ['runOnceForEachItem']])(
			'should make an rpc call for console log in %s mode',
			async (nodeMode) => {
				jest.spyOn(defaultTaskRunner, 'makeRpcCall').mockResolvedValue(undefined);
				const task = newTaskWithSettings({
					code: "console.log('Hello', 'world!'); return {}",
					nodeMode,
				});

				await execTaskWithParams({
					task,
					taskData: newAllCodeTaskData([wrapIntoJson({})]),
				});

				expect(defaultTaskRunner.makeRpcCall).toHaveBeenCalledWith(task.taskId, 'logNodeOutput', [
					'Hello world!',
				]);
			},
		);
	});

	describe('built-in methods and variables available in the context', () => {
		const inputItems = [{ a: 1 }];

		const testExpressionForAllItems = async (
			expression: string,
			expected: IDataObject | string | number | boolean,
		) => {
			const needsWrapping = typeof expected !== 'object';
			const outcome = await executeForAllItems({
				code: needsWrapping ? `return { val: ${expression} }` : `return ${expression}`,
				inputItems,
			});

			expect(outcome.result).toEqual([wrapIntoJson(needsWrapping ? { val: expected } : expected)]);
		};

		const testExpressionForEachItem = async (
			expression: string,
			expected: IDataObject | string | number | boolean,
		) => {
			const needsWrapping = typeof expected !== 'object';
			const outcome = await executeForEachItem({
				code: needsWrapping ? `return { val: ${expression} }` : `return ${expression}`,
				inputItems,
			});

			expect(outcome.result).toEqual([
				withPairedItem(0, wrapIntoJson(needsWrapping ? { val: expected } : expected)),
			]);
		};

		const testGroups = {
			// https://docs.n8n.io/code/builtin/current-node-input/
			'current node input': [
				['$input.first()', inputItems[0]],
				['$input.last()', inputItems[inputItems.length - 1]],
				['$input.params', { manualTriggerParam: 'empty' }],
			],
			// https://docs.n8n.io/code/builtin/output-other-nodes/
			'output of other nodes': [
				['$("Trigger").first()', inputItems[0]],
				['$("Trigger").last()', inputItems[inputItems.length - 1]],
				['$("Trigger").params', { manualTriggerParam: 'empty' }],
			],
			// https://docs.n8n.io/code/builtin/date-time/
			'date and time': [
				['$now', expect.any(DateTime)],
				['$today', expect.any(DateTime)],
				['{dt: DateTime}', { dt: expect.any(Function) }],
			],
			// https://docs.n8n.io/code/builtin/jmespath/
			JMESPath: [['{ val: $jmespath([{ f: 1 },{ f: 2 }], "[*].f") }', { val: [1, 2] }]],
			// https://docs.n8n.io/code/builtin/n8n-metadata/
			'n8n metadata': [
				[
					'$execution',
					{
						id: 'exec-id',
						mode: 'test',
						resumeFormUrl: 'http://formWaitingBaseUrl/exec-id',
						resumeUrl: 'http://webhookWaitingBaseUrl/exec-id',
						customData: {
							get: expect.any(Function),
							getAll: expect.any(Function),
							set: expect.any(Function),
							setAll: expect.any(Function),
						},
					},
				],
				['$("Trigger").isExecuted', true],
				['$nodeVersion', 2],
				['$prevNode.name', 'Trigger'],
				['$prevNode.outputIndex', 0],
				['$runIndex', 0],
				['{ wf: $workflow }', { wf: { active: true, id: '1', name: 'Test Workflow' } }],
				['$vars', { var: 'value' }],
			],
		};

		for (const [groupName, tests] of Object.entries(testGroups)) {
			describe(`${groupName} runOnceForAllItems`, () => {
				test.each(tests)(
					'should have the %s available in the context',
					async (expression, expected) => {
						await testExpressionForAllItems(expression, expected);
					},
				);
			});

			describe(`${groupName} runOnceForEachItem`, () => {
				test.each(tests)(
					'should have the %s available in the context',
					async (expression, expected) => {
						await testExpressionForEachItem(expression, expected);
					},
				);
			});
		}

		describe('$env', () => {
			it('should have the env available in context when access has not been blocked', async () => {
				const outcome = await execTaskWithParams({
					task: newTaskWithSettings({
						code: 'return { val: $env.VAR1 }',
						nodeMode: 'runOnceForAllItems',
					}),
					taskData: newAllCodeTaskData(inputItems.map(wrapIntoJson), {
						envProviderState: {
							isEnvAccessBlocked: false,
							isProcessAvailable: true,
							env: { VAR1: 'value' },
						},
					}),
				});

				expect(outcome.result).toEqual([wrapIntoJson({ val: 'value' })]);
			});

			it('should be possible to access env if it has been blocked', async () => {
				await expect(
					execTaskWithParams({
						task: newTaskWithSettings({
							code: 'return { val: $env.VAR1 }',
							nodeMode: 'runOnceForAllItems',
						}),
						taskData: newAllCodeTaskData(inputItems.map(wrapIntoJson), {
							envProviderState: {
								isEnvAccessBlocked: true,
								isProcessAvailable: true,
								env: { VAR1: 'value' },
							},
						}),
					}),
				).rejects.toThrow('access to env vars denied');
			});

			it('should not be possible to iterate $env', async () => {
				const outcome = await execTaskWithParams({
					task: newTaskWithSettings({
						code: 'return Object.values($env).concat(Object.keys($env))',
						nodeMode: 'runOnceForAllItems',
					}),
					taskData: newAllCodeTaskData(inputItems.map(wrapIntoJson), {
						envProviderState: {
							isEnvAccessBlocked: false,
							isProcessAvailable: true,
							env: { VAR1: '1', VAR2: '2', VAR3: '3' },
						},
					}),
				});

				expect(outcome.result).toEqual([]);
			});

			it("should not expose task runner's env variables even if no env state is received", async () => {
				process.env.N8N_RUNNERS_N8N_URI = 'http://127.0.0.1:5679';
				const outcome = await execTaskWithParams({
					task: newTaskWithSettings({
						code: 'return { val: $env.N8N_RUNNERS_N8N_URI }',
						nodeMode: 'runOnceForAllItems',
					}),
					taskData: newAllCodeTaskData(inputItems.map(wrapIntoJson), {
						envProviderState: undefined,
					}),
				});

				expect(outcome.result).toEqual([wrapIntoJson({ val: undefined })]);
			});
		});

		it('should allow access to Node.js Buffers', async () => {
			const outcome = await execTaskWithParams({
				task: newTaskWithSettings({
					code: 'return { val: Buffer.from("test-buffer").toString() }',
					nodeMode: 'runOnceForAllItems',
				}),
				taskData: newAllCodeTaskData(inputItems.map(wrapIntoJson), {
					envProviderState: undefined,
				}),
			});

			expect(outcome.result).toEqual([wrapIntoJson({ val: 'test-buffer' })]);
		});
	});

	describe('runOnceForAllItems', () => {
		describe('continue on fail', () => {
			it('should return an item with the error if continueOnFail is true', async () => {
				const outcome = await executeForAllItems({
					code: 'throw new Error("Error message")',
					inputItems: [{ a: 1 }],
					settings: { continueOnFail: true },
				});

				expect(outcome).toEqual({
					result: [wrapIntoJson({ error: 'Error message [line 1]' })],
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
		describe('continue on fail', () => {
			it('should return an item with the error if continueOnFail is true', async () => {
				const outcome = await executeForEachItem({
					code: 'throw new Error("Error message")',
					inputItems: [{ a: 1 }, { a: 2 }],
					settings: { continueOnFail: true },
				});

				expect(outcome).toEqual({
					result: [
						withPairedItem(0, wrapIntoJson({ error: 'Error message [line 1]' })),
						withPairedItem(1, wrapIntoJson({ error: 'Error message [line 1]' })),
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

	describe('require', () => {
		const inputItems = [{ a: 1 }];
		const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

		describe('blocked by default', () => {
			const testCases = [...builtinModules, ...Object.keys(packageJson.dependencies)];

			test.each(testCases)(
				'should throw an error when requiring %s in runOnceForAllItems mode',
				async (module) => {
					await expect(
						executeForAllItems({
							code: `return require('${module}')`,
							inputItems,
						}),
					).rejects.toThrow(`Cannot find module '${module}'`);
				},
			);

			test.each(testCases)(
				'should throw an error when requiring %s in runOnceForEachItem mode',
				async (module) => {
					await expect(
						executeForEachItem({
							code: `return require('${module}')`,
							inputItems,
						}),
					).rejects.toThrow(`Cannot find module '${module}'`);
				},
			);
		});

		describe('all built-ins allowed with *', () => {
			const testCases = builtinModules;
			const runner = createRunnerWithOpts({
				allowedBuiltInModules: '*',
			});

			test.each(testCases)(
				'should be able to require %s in runOnceForAllItems mode',
				async (module) => {
					await expect(
						executeForAllItems({
							code: `return { val: require('${module}') }`,
							inputItems,
							runner,
						}),
					).resolves.toBeDefined();
				},
			);

			test.each(testCases)(
				'should be able to require %s in runOnceForEachItem mode',
				async (module) => {
					await expect(
						executeForEachItem({
							code: `return { val: require('${module}') }`,
							inputItems,
							runner,
						}),
					).resolves.toBeDefined();
				},
			);
		});

		describe('all external modules allowed with *', () => {
			const testCases = Object.keys(packageJson.dependencies);
			const runner = createRunnerWithOpts({
				allowedExternalModules: '*',
			});

			test.each(testCases)(
				'should be able to require %s in runOnceForAllItems mode',
				async (module) => {
					await expect(
						executeForAllItems({
							code: `return { val: require('${module}') }`,
							inputItems,
							runner,
						}),
					).resolves.toBeDefined();
				},
			);

			test.each(testCases)(
				'should be able to require %s in runOnceForEachItem mode',
				async (module) => {
					await expect(
						executeForEachItem({
							code: `return { val: require('${module}') }`,
							inputItems,
							runner,
						}),
					).resolves.toBeDefined();
				},
			);
		});

		describe('specifically allowed built-in modules', () => {
			const runner = createRunnerWithOpts({
				allowedBuiltInModules: 'crypto,path',
			});

			const allowedCases = [
				['crypto', 'require("crypto").randomBytes(16).toString("hex")', expect.any(String)],
				['path', 'require("path").normalize("/root/./dir")', '/root/dir'],
			];

			const blockedCases = [['http'], ['process']];

			test.each(allowedCases)(
				'should allow requiring %s in runOnceForAllItems mode',
				async (_moduleName, expression, expected) => {
					const outcome = await executeForAllItems({
						code: `return { val: ${expression} }`,
						inputItems,
						runner,
					});

					expect(outcome.result).toEqual([wrapIntoJson({ val: expected })]);
				},
			);

			test.each(allowedCases)(
				'should allow requiring %s in runOnceForEachItem mode',
				async (_moduleName, expression, expected) => {
					const outcome = await executeForEachItem({
						code: `return { val: ${expression} }`,
						inputItems,
						runner,
					});

					expect(outcome.result).toEqual([withPairedItem(0, wrapIntoJson({ val: expected }))]);
				},
			);

			test.each(blockedCases)(
				'should throw when trying to require %s in runOnceForAllItems mode',
				async (moduleName) => {
					await expect(
						executeForAllItems({
							code: `require("${moduleName}")`,
							inputItems,
							runner,
						}),
					).rejects.toThrow(`Cannot find module '${moduleName}'`);
				},
			);

			test.each(blockedCases)(
				'should throw when trying to require %s in runOnceForEachItem mode',
				async (moduleName) => {
					await expect(
						executeForEachItem({
							code: `require("${moduleName}")`,
							inputItems,
							runner,
						}),
					).rejects.toThrow(`Cannot find module '${moduleName}'`);
				},
			);
		});

		describe('specifically allowed external modules', () => {
			const runner = createRunnerWithOpts({
				allowedExternalModules: 'nanoid',
			});

			const allowedCases = [['nanoid', 'require("nanoid").nanoid()', expect.any(String)]];

			const blockedCases = [['n8n-core']];

			test.each(allowedCases)(
				'should allow requiring %s in runOnceForAllItems mode',
				async (_moduleName, expression, expected) => {
					const outcome = await executeForAllItems({
						code: `return { val: ${expression} }`,
						inputItems,
						runner,
					});

					expect(outcome.result).toEqual([wrapIntoJson({ val: expected })]);
				},
			);

			test.each(allowedCases)(
				'should allow requiring %s in runOnceForEachItem mode',
				async (_moduleName, expression, expected) => {
					const outcome = await executeForEachItem({
						code: `return { val: ${expression} }`,
						inputItems,
						runner,
					});

					expect(outcome.result).toEqual([withPairedItem(0, wrapIntoJson({ val: expected }))]);
				},
			);

			test.each(blockedCases)(
				'should throw when trying to require %s in runOnceForAllItems mode',
				async (moduleName) => {
					await expect(
						executeForAllItems({
							code: `require("${moduleName}")`,
							inputItems,
							runner,
						}),
					).rejects.toThrow(`Cannot find module '${moduleName}'`);
				},
			);

			test.each(blockedCases)(
				'should throw when trying to require %s in runOnceForEachItem mode',
				async (moduleName) => {
					await expect(
						executeForEachItem({
							code: `require("${moduleName}")`,
							inputItems,
							runner,
						}),
					).rejects.toThrow(`Cannot find module '${moduleName}'`);
				},
			);
		});
	});

	describe('errors', () => {
		test.each<[CodeExecutionMode]>([['runOnceForAllItems'], ['runOnceForEachItem']])(
			'should throw an ExecutionError if the code is invalid in %s mode',
			async (nodeMode) => {
				await expect(
					execTaskWithParams({
						task: newTaskWithSettings({
							code: 'unknown',
							nodeMode,
						}),
						taskData: newAllCodeTaskData([wrapIntoJson({ a: 1 })]),
					}),
				).rejects.toThrow(ExecutionError);
			},
		);

		it('sends serializes an error correctly', async () => {
			const runner = createRunnerWithOpts({});
			const taskId = '1';
			const task = newTaskWithSettings({
				code: 'unknown; return []',
				nodeMode: 'runOnceForAllItems',
				continueOnFail: false,
				mode: 'manual',
				workflowMode: 'manual',
			});
			runner.runningTasks.set(taskId, task);

			const sendSpy = jest.spyOn(runner.ws, 'send').mockImplementation(() => {});
			jest.spyOn(runner, 'sendOffers').mockImplementation(() => {});
			jest
				.spyOn(runner, 'requestData')
				.mockResolvedValue(newAllCodeTaskData([wrapIntoJson({ a: 1 })]));

			await runner.receivedSettings(taskId, task.settings);

			expect(sendSpy).toHaveBeenCalledWith(
				JSON.stringify({
					type: 'runner:taskerror',
					taskId,
					error: {
						message: 'unknown is not defined [line 1]',
						description: 'ReferenceError',
						lineNumber: 1,
					},
				}),
			);
		}, 1000);
	});
});
