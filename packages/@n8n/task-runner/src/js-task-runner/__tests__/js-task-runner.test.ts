import { DateTime, Duration, Interval } from 'luxon';
import {
	type IBinaryData,
	setGlobalState,
	type CodeExecutionMode,
	type IDataObject,
} from 'n8n-workflow';
import fs from 'node:fs';
import { builtinModules } from 'node:module';

import type { BaseRunnerConfig } from '@/config/base-runner-config';
import type { JsRunnerConfig } from '@/config/js-runner-config';
import { MainConfig } from '@/config/main-config';
import { ExecutionError } from '@/js-task-runner/errors/execution-error';
import { UnsupportedFunctionError } from '@/js-task-runner/errors/unsupported-function.error';
import type { JSExecSettings } from '@/js-task-runner/js-task-runner';
import { JsTaskRunner } from '@/js-task-runner/js-task-runner';
import {
	UNSUPPORTED_HELPER_FUNCTIONS,
	type DataRequestResponse,
	type InputDataChunkDefinition,
} from '@/runner-types';
import type { TaskParams } from '@/task-runner';

import {
	newDataRequestResponse,
	newTaskParamsWithSettings,
	newTaskState,
	withPairedItem,
	wrapIntoJson,
} from './test-data';

jest.mock('ws');

const defaultConfig = new MainConfig();
defaultConfig.jsRunnerConfig ??= {
	allowedBuiltInModules: '',
	allowedExternalModules: '',
	insecureMode: false,
};

describe('JsTaskRunner', () => {
	const createRunnerWithOpts = (
		jsRunnerOpts: Partial<JsRunnerConfig> = {},
		baseRunnerOpts: Partial<BaseRunnerConfig> = {},
	) =>
		new JsTaskRunner({
			baseRunnerConfig: {
				...defaultConfig.baseRunnerConfig,
				grantToken: 'grantToken',
				maxConcurrency: 1,
				taskBrokerUri: 'http://localhost',
				taskTimeout: 60,
				...baseRunnerOpts,
			},
			jsRunnerConfig: {
				...defaultConfig.jsRunnerConfig,
				...jsRunnerOpts,
			},
			sentryConfig: {
				dsn: '',
				deploymentName: '',
				environment: '',
				n8nVersion: '',
			},
		});

	const defaultTaskRunner = createRunnerWithOpts();

	const execTaskWithParams = async ({
		task,
		taskData,
		runner = defaultTaskRunner,
	}: {
		task: TaskParams<JSExecSettings>;
		taskData: DataRequestResponse;
		runner?: JsTaskRunner;
	}) => {
		jest.spyOn(runner, 'requestData').mockResolvedValue(taskData);
		return await runner.executeTask(task, new AbortController().signal);
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
			task: newTaskParamsWithSettings({
				code,
				nodeMode: 'runOnceForAllItems',
				...settings,
			}),
			taskData: newDataRequestResponse(inputItems.map(wrapIntoJson)),
			runner,
		});
	};

	const executeForEachItem = async ({
		code,
		inputItems,
		settings,
		runner,
		chunk,
	}: {
		code: string;
		inputItems: IDataObject[];
		settings?: Partial<JSExecSettings>;
		runner?: JsTaskRunner;
		chunk?: InputDataChunkDefinition;
	}) => {
		return await execTaskWithParams({
			task: newTaskParamsWithSettings({
				code,
				nodeMode: 'runOnceForEachItem',
				chunk,
				...settings,
			}),
			taskData: newDataRequestResponse(inputItems.map(wrapIntoJson)),
			runner,
		});
	};

	describe('console', () => {
		test.each<[CodeExecutionMode]>([['runOnceForAllItems'], ['runOnceForEachItem']])(
			'should make an rpc call for console log in %s mode',
			async (nodeMode) => {
				jest.spyOn(defaultTaskRunner, 'makeRpcCall').mockResolvedValue(undefined);
				const task = newTaskParamsWithSettings({
					code: "console.log('Hello', 'world!'); return {}",
					nodeMode,
				});

				await execTaskWithParams({
					task,
					taskData: newDataRequestResponse([wrapIntoJson({})]),
				});

				expect(defaultTaskRunner.makeRpcCall).toHaveBeenCalledWith(task.taskId, 'logNodeOutput', [
					"'Hello'",
					"'world!'",
				]);
			},
		);

		it('should not throw when using unsupported console methods', async () => {
			const task = newTaskParamsWithSettings({
				code: `
					console.warn('test');
					console.error('test');
					console.info('test');
					console.debug('test');
					console.trace('test');
					console.dir({});
					console.time('test');
					console.timeEnd('test');
					console.timeLog('test');
					console.assert(true);
					console.clear();
					console.group('test');
					console.groupEnd();
					console.table([]);
					return {json: {}}
				`,
				nodeMode: 'runOnceForAllItems',
			});

			await expect(
				execTaskWithParams({
					task,
					taskData: newDataRequestResponse([wrapIntoJson({})]),
				}),
			).resolves.toBeDefined();
		});

		it('should not throw when trying to log the context object', async () => {
			const task = newTaskParamsWithSettings({
				code: `
					console.log(this);
					return {json: {}}
				`,
				nodeMode: 'runOnceForAllItems',
			});

			await expect(
				execTaskWithParams({
					task,
					taskData: newDataRequestResponse([wrapIntoJson({})]),
				}),
			).resolves.toBeDefined();
		});

		it('should log the context object as [[ExecutionContext]]', async () => {
			const rpcCallSpy = jest.spyOn(defaultTaskRunner, 'makeRpcCall').mockResolvedValue(undefined);

			const task = newTaskParamsWithSettings({
				code: `
					console.log(this);
					return {json: {}}
				`,
				nodeMode: 'runOnceForAllItems',
			});

			await execTaskWithParams({
				task,
				taskData: newDataRequestResponse([wrapIntoJson({})]),
			});

			expect(rpcCallSpy).toHaveBeenCalledWith(task.taskId, 'logNodeOutput', [
				'[[ExecutionContext]]',
			]);
		});
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

			expect(outcome.result).toEqual(needsWrapping ? { val: expected } : expected);
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

			// if expected has json property, use it, else use entire result
			const expectedJson =
				expected !== null && typeof expected === 'object' && 'json' in expected
					? expected.json
					: needsWrapping
						? { val: expected }
						: expected;

			expect(outcome.result).toEqual([{ json: expectedJson, pairedItem: { item: 0 } }]);
		};

		const testGroups = {
			// https://docs.n8n.io/code/builtin/current-node-input/
			'current node input': [
				['$input.first()', { json: inputItems[0] }],
				['$input.last()', { json: inputItems[inputItems.length - 1] }],
				['$input.params', { manualTriggerParam: 'empty' }],
			],
			// https://docs.n8n.io/code/builtin/output-other-nodes/
			'output of other nodes': [
				['$("Trigger").first()', { json: inputItems[0] }],
				['$("Trigger").last()', { json: inputItems[inputItems.length - 1] }],
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
				['$getWorkflowStaticData("global")', {}],
			],
			'Node.js internal functions': [
				['typeof Function', 'function'],
				['typeof eval', 'function'],
				['typeof setTimeout', 'function'],
				['typeof setInterval', 'function'],
				['typeof setImmediate', 'function'],
				['typeof clearTimeout', 'function'],
				['typeof clearInterval', 'function'],
				['typeof clearImmediate', 'function'],
			],
			eval: [['eval("1+2")', 3]],
			'JS built-ins': [
				['typeof btoa', 'function'],
				['typeof atob', 'function'],
				['typeof TextDecoder', 'function'],
				['typeof TextDecoderStream', 'function'],
				['typeof TextEncoder', 'function'],
				['typeof TextEncoderStream', 'function'],
				['typeof FormData', 'function'],
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
					task: newTaskParamsWithSettings({
						code: 'return { val: $env.VAR1 }',
						nodeMode: 'runOnceForAllItems',
					}),
					taskData: newDataRequestResponse(inputItems.map(wrapIntoJson), {
						envProviderState: {
							isEnvAccessBlocked: false,
							isProcessAvailable: true,
							env: { VAR1: 'value' },
						},
					}),
				});

				expect(outcome.result).toEqual({ val: 'value' });
			});

			it('should be possible to access env if it has been blocked', async () => {
				await expect(
					execTaskWithParams({
						task: newTaskParamsWithSettings({
							code: 'return { val: $env.VAR1 }',
							nodeMode: 'runOnceForAllItems',
						}),
						taskData: newDataRequestResponse(inputItems.map(wrapIntoJson), {
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
					task: newTaskParamsWithSettings({
						code: 'return Object.values($env).concat(Object.keys($env))',
						nodeMode: 'runOnceForAllItems',
					}),
					taskData: newDataRequestResponse(inputItems.map(wrapIntoJson), {
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
				process.env.N8N_RUNNERS_TASK_BROKER_URI = 'http://127.0.0.1:5679';
				const outcome = await execTaskWithParams({
					task: newTaskParamsWithSettings({
						code: 'return { val: $env.N8N_RUNNERS_TASK_BROKER_URI }',
						nodeMode: 'runOnceForAllItems',
					}),
					taskData: newDataRequestResponse(inputItems.map(wrapIntoJson), {
						envProviderState: undefined,
					}),
				});

				expect(outcome.result).toEqual({ val: undefined });
			});
		});

		describe('timezone', () => {
			it('should use the specified timezone in the workflow', async () => {
				const taskData = newDataRequestResponse(inputItems.map(wrapIntoJson), {});
				taskData.workflow.settings = {
					timezone: 'Europe/Helsinki',
				};

				const outcome = await execTaskWithParams({
					task: newTaskParamsWithSettings({
						code: 'return { val: $now.toSeconds() }',
						nodeMode: 'runOnceForAllItems',
					}),
					taskData,
				});

				const helsinkiTimeNow = DateTime.now().setZone('Europe/Helsinki').toSeconds();
				expect(outcome.result).toEqual({ val: expect.closeTo(helsinkiTimeNow, 1) });
			});

			it('should use the default timezone', async () => {
				setGlobalState({
					defaultTimezone: 'Europe/Helsinki',
				});

				const outcome = await execTaskWithParams({
					task: newTaskParamsWithSettings({
						code: 'return { val: $now.toSeconds() }',
						nodeMode: 'runOnceForAllItems',
					}),
					taskData: newDataRequestResponse(inputItems.map(wrapIntoJson), {}),
				});

				const helsinkiTimeNow = DateTime.now().setZone('Europe/Helsinki').toSeconds();
				expect(outcome.result).toEqual({ val: expect.closeTo(helsinkiTimeNow, 1) });
			});
		});

		describe("$getWorkflowStaticData('global')", () => {
			it('should have the global workflow static data available in runOnceForAllItems', async () => {
				const outcome = await execTaskWithParams({
					task: newTaskParamsWithSettings({
						code: 'return { val: $getWorkflowStaticData("global") }',
						nodeMode: 'runOnceForAllItems',
					}),
					taskData: newDataRequestResponse(inputItems.map(wrapIntoJson), {
						staticData: {
							global: { key: 'value' },
						},
					}),
				});

				expect(outcome.result).toEqual({ val: { key: 'value' } });
			});

			it('should have the global workflow static data available in runOnceForEachItem', async () => {
				const outcome = await execTaskWithParams({
					task: newTaskParamsWithSettings({
						code: 'return { val: $getWorkflowStaticData("global") }',
						nodeMode: 'runOnceForEachItem',
					}),
					taskData: newDataRequestResponse(inputItems.map(wrapIntoJson), {
						staticData: {
							global: { key: 'value' },
						},
					}),
				});

				expect(outcome.result).toEqual([
					withPairedItem(0, wrapIntoJson({ val: { key: 'value' } })),
				]);
			});

			test.each<[CodeExecutionMode]>([['runOnceForAllItems'], ['runOnceForEachItem']])(
				"does not return static data if it hasn't been modified in %s",
				async (mode) => {
					const outcome = await execTaskWithParams({
						task: newTaskParamsWithSettings({
							code: `
								const staticData = $getWorkflowStaticData("global");
								return { val: staticData };
							`,
							nodeMode: mode,
						}),
						taskData: newDataRequestResponse(inputItems.map(wrapIntoJson), {
							staticData: {
								global: { key: 'value' },
							},
						}),
					});

					expect(outcome.staticData).toBeUndefined();
				},
			);

			test.each<[CodeExecutionMode]>([['runOnceForAllItems'], ['runOnceForEachItem']])(
				'returns the updated static data in %s',
				async (mode) => {
					const outcome = await execTaskWithParams({
						task: newTaskParamsWithSettings({
							code: `
								const staticData = $getWorkflowStaticData("global");
								staticData.newKey = 'newValue';
								return { val: staticData };
							`,
							nodeMode: mode,
						}),
						taskData: newDataRequestResponse(inputItems.map(wrapIntoJson), {
							staticData: {
								global: { key: 'value' },
								'node:OtherNode': { some: 'data' },
							},
						}),
					});

					expect(outcome.staticData).toEqual({
						global: { key: 'value', newKey: 'newValue' },
						'node:OtherNode': { some: 'data' },
					});
				},
			);
		});

		describe("$getWorkflowStaticData('node')", () => {
			const createTaskDataWithNodeStaticData = (nodeStaticData: IDataObject) => {
				const taskData = newDataRequestResponse(inputItems.map(wrapIntoJson));
				const taskDataKey = `node:${taskData.node.name}`;
				taskData.workflow.staticData = {
					global: { 'global-key': 'global-value' },
					'node:OtherNode': { 'other-key': 'other-value' },
					[taskDataKey]: nodeStaticData,
				};

				return taskData;
			};

			it('should have the node workflow static data available in runOnceForAllItems', async () => {
				const outcome = await execTaskWithParams({
					task: newTaskParamsWithSettings({
						code: 'return { val: $getWorkflowStaticData("node") }',
						nodeMode: 'runOnceForAllItems',
					}),
					taskData: createTaskDataWithNodeStaticData({ key: 'value' }),
				});

				expect(outcome.result).toEqual({ val: { key: 'value' } });
			});

			it('should have the node workflow static data available in runOnceForEachItem', async () => {
				const outcome = await execTaskWithParams({
					task: newTaskParamsWithSettings({
						code: 'return { val: $getWorkflowStaticData("node") }',
						nodeMode: 'runOnceForEachItem',
					}),
					taskData: createTaskDataWithNodeStaticData({ key: 'value' }),
				});

				expect(outcome.result).toEqual([
					withPairedItem(0, wrapIntoJson({ val: { key: 'value' } })),
				]);
			});

			test.each<[CodeExecutionMode]>([['runOnceForAllItems'], ['runOnceForEachItem']])(
				"does not return static data if it hasn't been modified in %s",
				async (mode) => {
					const outcome = await execTaskWithParams({
						task: newTaskParamsWithSettings({
							code: `
								const staticData = $getWorkflowStaticData("node");
								return { val: staticData };
							`,
							nodeMode: mode,
						}),
						taskData: createTaskDataWithNodeStaticData({ key: 'value' }),
					});

					expect(outcome.staticData).toBeUndefined();
				},
			);

			test.each<[CodeExecutionMode]>([['runOnceForAllItems'], ['runOnceForEachItem']])(
				'returns the updated static data in %s',
				async (mode) => {
					const outcome = await execTaskWithParams({
						task: newTaskParamsWithSettings({
							code: `
								const staticData = $getWorkflowStaticData("node");
								staticData.newKey = 'newValue';
								return { val: staticData };
							`,
							nodeMode: mode,
						}),
						taskData: createTaskDataWithNodeStaticData({ key: 'value' }),
					});

					expect(outcome.staticData).toEqual({
						global: { 'global-key': 'global-value' },
						'node:JsCode': {
							key: 'value',
							newKey: 'newValue',
						},
						'node:OtherNode': {
							'other-key': 'other-value',
						},
					});
				},
			);
		});

		describe('helpers', () => {
			const binaryDataFile: IBinaryData = {
				data: 'data',
				fileName: 'file.txt',
				mimeType: 'text/plain',
			};

			const groups = [
				{
					method: 'helpers.assertBinaryData',
					invocation: "helpers.assertBinaryData(0, 'binaryFile')",
					expectedParams: [0, 'binaryFile'],
				},
				{
					method: 'helpers.getBinaryDataBuffer',
					invocation: "helpers.getBinaryDataBuffer(0, 'binaryFile')",
					expectedParams: [0, 'binaryFile'],
				},
				{
					method: 'helpers.prepareBinaryData',
					invocation: "helpers.prepareBinaryData(Buffer.from('123'), 'file.txt', 'text/plain')",
					expectedParams: [Buffer.from('123'), 'file.txt', 'text/plain'],
				},
				{
					method: 'helpers.setBinaryDataBuffer',
					invocation:
						"helpers.setBinaryDataBuffer({ data: '123', mimeType: 'text/plain' }, Buffer.from('321'))",
					expectedParams: [{ data: '123', mimeType: 'text/plain' }, Buffer.from('321')],
				},
				{
					method: 'helpers.binaryToString',
					invocation: "helpers.binaryToString(Buffer.from('123'), 'utf8')",
					expectedParams: [Buffer.from('123'), 'utf8'],
				},
				{
					method: 'helpers.httpRequest',
					invocation: "helpers.httpRequest({ method: 'GET', url: 'http://localhost' })",
					expectedParams: [{ method: 'GET', url: 'http://localhost' }],
				},
			];

			for (const group of groups) {
				it(`${group.method} for runOnceForAllItems`, async () => {
					// Arrange
					const rpcCallSpy = jest
						.spyOn(defaultTaskRunner, 'makeRpcCall')
						.mockResolvedValue(undefined);

					// Act
					await execTaskWithParams({
						task: newTaskParamsWithSettings({
							code: `await ${group.invocation}; return []`,
							nodeMode: 'runOnceForAllItems',
						}),
						taskData: newDataRequestResponse(
							[{ json: {}, binary: { binaryFile: binaryDataFile } }],
							{},
						),
					});

					// Assert
					expect(rpcCallSpy).toHaveBeenCalledWith('1', group.method, group.expectedParams);
				});

				it(`${group.method} for runOnceForEachItem`, async () => {
					// Arrange
					const rpcCallSpy = jest
						.spyOn(defaultTaskRunner, 'makeRpcCall')
						.mockResolvedValue(undefined);

					// Act
					await execTaskWithParams({
						task: newTaskParamsWithSettings({
							code: `await ${group.invocation}; return {}`,
							nodeMode: 'runOnceForEachItem',
						}),
						taskData: newDataRequestResponse(
							[{ json: {}, binary: { binaryFile: binaryDataFile } }],
							{},
						),
					});

					expect(rpcCallSpy).toHaveBeenCalledWith('1', group.method, group.expectedParams);
				});
			}

			describe('unsupported methods', () => {
				for (const unsupportedFunction of UNSUPPORTED_HELPER_FUNCTIONS) {
					it(`should throw an error if ${unsupportedFunction} is used in runOnceForAllItems`, async () => {
						// Act & Assert
						await expect(
							executeForAllItems({
								code: `${unsupportedFunction}()`,
								inputItems,
							}),
						).rejects.toThrow(UnsupportedFunctionError);
					});

					it(`should throw an error if ${unsupportedFunction} is used in runOnceForEachItem`, async () => {
						// Act & Assert
						await expect(
							executeForEachItem({
								code: `${unsupportedFunction}()`,
								inputItems,
							}),
						).rejects.toThrow(UnsupportedFunctionError);
					});
				}
			});
		});

		it('should allow access to Node.js Buffers', async () => {
			const outcomeAll = await execTaskWithParams({
				task: newTaskParamsWithSettings({
					code: 'return { val: Buffer.from("test-buffer").toString() }',
					nodeMode: 'runOnceForAllItems',
				}),
				taskData: newDataRequestResponse(inputItems.map(wrapIntoJson), {
					envProviderState: undefined,
				}),
			});

			expect(outcomeAll.result).toEqual({ val: 'test-buffer' });

			const outcomePer = await execTaskWithParams({
				task: newTaskParamsWithSettings({
					code: 'return { val: Buffer.from("test-buffer").toString() }',
					nodeMode: 'runOnceForEachItem',
				}),
				taskData: newDataRequestResponse(inputItems.map(wrapIntoJson), {
					envProviderState: undefined,
				}),
			});

			expect(outcomePer.result).toEqual([
				{ ...wrapIntoJson({ val: 'test-buffer' }), pairedItem: { item: 0 } },
			]);
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
				result: [{ b: 1 }],
				customData: undefined,
			});
		});

		it('should not wrap single item into an array and json', async () => {
			const outcome = await executeForAllItems({
				code: 'return {b: 1}',
				inputItems: [{ a: 1 }],
			});

			expect(outcome).toEqual({
				result: { b: 1 },
				customData: undefined,
			});
		});

		test.each([['items'], ['$input.all()'], ["$('Trigger').all()"], ['$items()']])(
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

		describe('chunked execution', () => {
			it('should use correct index for each item', async () => {
				const outcome = await executeForEachItem({
					code: 'return { ...$json, idx: $itemIndex }',
					inputItems: [{ a: 1 }, { b: 2 }, { c: 3 }],
					chunk: {
						startIndex: 100,
						count: 3,
					},
				});

				expect(outcome).toEqual({
					result: [
						withPairedItem(100, wrapIntoJson({ a: 1, idx: 100 })),
						withPairedItem(101, wrapIntoJson({ b: 2, idx: 101 })),
						withPairedItem(102, wrapIntoJson({ c: 3, idx: 102 })),
					],
					customData: undefined,
				});
			});
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
					).rejects.toThrow(`Module '${module}' is disallowed`);
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
					).rejects.toThrow(`Module '${module}' is disallowed`);
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

					expect(outcome.result).toEqual({ val: expected });
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
					).rejects.toThrow(`Module '${moduleName}' is disallowed`);
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
					).rejects.toThrow(`Module '${moduleName}' is disallowed`);
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

					expect(outcome.result).toEqual({ val: expected });
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
					).rejects.toThrow(`Module '${moduleName}' is disallowed`);
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
					).rejects.toThrow(`Module '${moduleName}' is disallowed`);
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
						task: newTaskParamsWithSettings({
							code: 'unknown',
							nodeMode,
						}),
						taskData: newDataRequestResponse([wrapIntoJson({ a: 1 })]),
					}),
				).rejects.toThrow(ExecutionError);
			},
		);

		it('sends serializes an error correctly', async () => {
			const runner = createRunnerWithOpts({});
			const taskId = '1';
			const task = newTaskState(taskId);
			const taskSettings: JSExecSettings = {
				code: 'unknown; return []',
				nodeMode: 'runOnceForAllItems',
				continueOnFail: false,
				workflowMode: 'manual',
			};
			runner.runningTasks.set(taskId, task);

			const sendSpy = jest.spyOn(runner.ws, 'send').mockImplementation(() => {});
			jest.spyOn(runner, 'sendOffers').mockImplementation(() => {});
			jest
				.spyOn(runner, 'requestData')
				.mockResolvedValue(newDataRequestResponse([wrapIntoJson({ a: 1 })]));

			await runner.receivedSettings(taskId, taskSettings);

			expect(sendSpy).toHaveBeenCalled();
			const calledWith = sendSpy.mock.calls[0][0] as string;
			expect(typeof calledWith).toBe('string');
			const calledObject = JSON.parse(calledWith);
			expect(calledObject).toEqual({
				type: 'runner:taskerror',
				taskId,
				error: {
					stack: expect.any(String),
					message: 'unknown is not defined [line 1]',
					description: 'ReferenceError',
					lineNumber: 1,
				},
			});
		});
	});

	describe('idle timeout', () => {
		beforeEach(() => {
			jest.useFakeTimers();
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should set idle timer when instantiated', () => {
			const idleTimeout = 5;
			const runner = createRunnerWithOpts({}, { idleTimeout });
			const emitSpy = jest.spyOn(runner, 'emit');

			jest.advanceTimersByTime(idleTimeout * 1000 - 100);
			expect(emitSpy).not.toHaveBeenCalledWith('runner:reached-idle-timeout');

			jest.advanceTimersByTime(idleTimeout * 1000);
			expect(emitSpy).toHaveBeenCalledWith('runner:reached-idle-timeout');
		});

		it('should reset idle timer when accepting a task', () => {
			const idleTimeout = 5;
			const runner = createRunnerWithOpts({}, { idleTimeout });
			const taskId = '123';
			const offerId = 'offer123';
			const emitSpy = jest.spyOn(runner, 'emit');

			jest.advanceTimersByTime(idleTimeout * 1000 - 100);
			expect(emitSpy).not.toHaveBeenCalledWith('runner:reached-idle-timeout');

			runner.openOffers.set(offerId, {
				offerId,
				validUntil: process.hrtime.bigint() + BigInt(idleTimeout * 1000 * 1_000_000),
			});
			runner.offerAccepted(offerId, taskId);

			jest.advanceTimersByTime(200);
			expect(emitSpy).not.toHaveBeenCalledWith('runner:reached-idle-timeout'); // because timer was reset

			runner.runningTasks.clear();

			jest.advanceTimersByTime(idleTimeout * 1000);
			expect(emitSpy).toHaveBeenCalledWith('runner:reached-idle-timeout');
		});

		it('should reset idle timer when finishing a task', async () => {
			const idleTimeout = 5;
			const runner = createRunnerWithOpts({}, { idleTimeout });
			const taskId = '123';
			const emitSpy = jest.spyOn(runner, 'emit');
			jest.spyOn(runner, 'executeTask').mockResolvedValue({ result: [] });

			runner.runningTasks.set(taskId, newTaskState(taskId));

			jest.advanceTimersByTime(idleTimeout * 1000 - 100);
			expect(emitSpy).not.toHaveBeenCalledWith('runner:reached-idle-timeout');

			await runner.receivedSettings(taskId, {});

			jest.advanceTimersByTime(200);
			expect(emitSpy).not.toHaveBeenCalledWith('runner:reached-idle-timeout'); // because timer was reset

			jest.advanceTimersByTime(idleTimeout * 1000);
			expect(emitSpy).toHaveBeenCalledWith('runner:reached-idle-timeout');
		});

		it('should never reach idle timeout if idle timeout is set to 0', () => {
			const runner = createRunnerWithOpts({}, { idleTimeout: 0 });
			const emitSpy = jest.spyOn(runner, 'emit');

			jest.advanceTimersByTime(999999);
			expect(emitSpy).not.toHaveBeenCalledWith('runner:reached-idle-timeout');
		});

		it('should not reach idle timeout if there are running tasks', () => {
			const idleTimeout = 5;
			const runner = createRunnerWithOpts({}, { idleTimeout });
			const taskId = '123';
			const emitSpy = jest.spyOn(runner, 'emit');
			const task = newTaskState(taskId);

			runner.runningTasks.set(taskId, task);

			jest.advanceTimersByTime(idleTimeout * 1000);
			expect(emitSpy).not.toHaveBeenCalledWith('runner:reached-idle-timeout');
			task.cleanup();
		});
	});

	describe('prototype pollution prevention', () => {
		const checkPrototypeIntact = () => {
			const obj: Record<string, unknown> = {};
			expect(obj.maliciousKey).toBeUndefined();
		};

		test('Object.setPrototypeOf should no-op for local object', async () => {
			checkPrototypeIntact();

			const outcome = await executeForAllItems({
				code: `
					const obj = {};
					Object.setPrototypeOf(obj, { maliciousKey: 'value' });
					return [{ json: { prototypeChanged: obj.maliciousKey !== undefined } }];
				`,
				inputItems: [{ a: 1 }],
			});

			expect(outcome.result).toEqual([wrapIntoJson({ prototypeChanged: false })]);
			checkPrototypeIntact();
		});

		test('Reflect.setPrototypeOf should no-op for local object', async () => {
			checkPrototypeIntact();

			const outcome = await executeForAllItems({
				code: `
					const obj = {};
					Reflect.setPrototypeOf(obj, { maliciousKey: 'value' });
					return [{ json: { prototypeChanged: obj.maliciousKey !== undefined } }];
				`,
				inputItems: [{ a: 1 }],
			});

			expect(outcome.result).toEqual([wrapIntoJson({ prototypeChanged: false })]);
			checkPrototypeIntact();
		});

		test('Object.setPrototypeOf should no-op for incoming object', async () => {
			checkPrototypeIntact();

			const outcome = await executeForAllItems({
				code: `
					const obj = $input.first();
					Object.setPrototypeOf(obj, { maliciousKey: 'value' });
					return [{ json: { prototypeChanged: obj.maliciousKey !== undefined } }];
				`,
				inputItems: [{ a: 1 }],
			});

			expect(outcome.result).toEqual([wrapIntoJson({ prototypeChanged: false })]);
			checkPrototypeIntact();
		});

		test('Reflect.setPrototypeOf should no-op for incoming object', async () => {
			checkPrototypeIntact();

			const outcome = await executeForAllItems({
				code: `
					const obj = $input.first();
					Reflect.setPrototypeOf(obj, { maliciousKey: 'value' });
					return [{ json: { prototypeChanged: obj.maliciousKey !== undefined } }];
				`,
				inputItems: [{ a: 1 }],
			});

			expect(outcome.result).toEqual([wrapIntoJson({ prototypeChanged: false })]);
			checkPrototypeIntact();
		});

		test('should freeze luxon prototypes', async () => {
			const outcome = await executeForAllItems({
				code: `
				[DateTime, Interval, Duration]
						.forEach(constructor => {
								constructor.prototype.maliciousKey = 'value';
						});

				return []
				`,
				inputItems: [{ a: 1 }],
			});

			expect(outcome.result).toEqual([]);

			// @ts-expect-error Non-existing property
			expect(DateTime.now().maliciousKey).toBeUndefined();
			// @ts-expect-error Non-existing property
			expect(Interval.fromISO('P1Y2M10DT2H30M').maliciousKey).toBeUndefined();
			// @ts-expect-error Non-existing property
			expect(Duration.fromObject({ hours: 1 }).maliciousKey).toBeUndefined();
		});

		it('should allow prototype mutation when `insecureMode` is true', async () => {
			const runner = createRunnerWithOpts({
				insecureMode: true,
			});

			const outcome = await executeForAllItems({
				code: `
					const obj = {};

					Object.prototype.maliciousProperty = 'compromised';

					return [{ json: {
						prototypeMutated: obj.maliciousProperty === 'compromised'
					}}];
				`,
				inputItems: [{ a: 1 }],
				runner,
			});

			expect(outcome.result).toEqual([wrapIntoJson({ prototypeMutated: true })]);

			// @ts-expect-error Non-existing property
			delete Object.prototype.maliciousProperty;
		});
	});

	describe('stack trace', () => {
		it('should extract correct line number from user-defined function stack trace', async () => {
			const runner = createRunnerWithOpts({});
			const taskId = '1';
			const task = newTaskState(taskId);
			const taskSettings: JSExecSettings = {
				code: 'function my_function() {\n  null.map();\n}\nmy_function();\nreturn []',
				nodeMode: 'runOnceForAllItems',
				continueOnFail: false,
				workflowMode: 'manual',
			};
			runner.runningTasks.set(taskId, task);

			const sendSpy = jest.spyOn(runner.ws, 'send').mockImplementation(() => {});
			jest.spyOn(runner, 'sendOffers').mockImplementation(() => {});
			jest
				.spyOn(runner, 'requestData')
				.mockResolvedValue(newDataRequestResponse([wrapIntoJson({ a: 1 })]));

			await runner.receivedSettings(taskId, taskSettings);

			expect(sendSpy).toHaveBeenCalled();
			const calledWith = sendSpy.mock.calls[0][0] as string;
			expect(typeof calledWith).toBe('string');
			const calledObject = JSON.parse(calledWith);
			expect(calledObject).toEqual({
				type: 'runner:taskerror',
				taskId,
				error: {
					stack: expect.any(String),
					message: expect.stringContaining('Cannot read properties of null'),
					description: 'TypeError',
					lineNumber: 2, // from user-defined function
				},
			});
		});
	});

	describe('expressions', () => {
		it('should evaluate expressions with $evaluateExpression', async () => {
			const outcome = await executeForAllItems({
				code: "return { val: $evaluateExpression('{{ 1 + 1 }}') }",
				inputItems: [],
			});

			expect(outcome.result).toEqual({ val: 2 });
		});
	});
});
