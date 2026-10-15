import { TaskRunnersConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type {
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeParameters,
	INodeTypes,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	createEnvProviderState,
	createRunExecutionData,
	NodeConnectionTypes,
	Workflow,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { LocalTaskRequester } from '@/task-runners/task-managers/local-task-requester';
import { TaskRunnerModule } from '@/task-runners/task-runner-module';
import { PyTaskRunnerProcess } from '@/task-runners/task-runner-process-py';

// `restoreMocks: true` in the root vi config restores spies between tests,
// but the Python runtime check is invoked from inner describes' `beforeAll`
// hooks (which run after the previous test's restore). Patching the static
// method directly keeps the stub active for the whole test file.
const originalCheckRequirements = PyTaskRunnerProcess.checkRequirements;
beforeAll(() => {
	PyTaskRunnerProcess.checkRequirements = async () => 'python';
});
afterAll(() => {
	PyTaskRunnerProcess.checkRequirements = originalCheckRequirements;
});

/**
 * Integration tests for the JS TaskRunner execution. Starts the TaskRunner
 * as a child process and executes tasks on it via the broker.
 */
describe('JS TaskRunner execution on internal mode', () => {
	const runnerConfig = Container.get(TaskRunnersConfig);
	runnerConfig.mode = 'internal';
	runnerConfig.port = 45678;

	const taskRunnerModule = Container.get(TaskRunnerModule);
	const taskRequester = Container.get(LocalTaskRequester);

	/**
	 * Sets up task data that includes a workflow with manual trigger and a
	 * code node with the given JS code. The input data is a single item:
	 * ```json
	 * {
	 *   "input": "item"
	 * }
	 * ```
	 */
	const newTaskData = (jsCode: string) => {
		const taskSettings = {
			code: jsCode,
			nodeMode: 'runOnceForAllItems',
			workflowMode: 'manual',
			continueOnFail: false,
		};

		const codeNode: INode = {
			parameters: {
				jsCode,
			},
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: [200, 80],
			id: 'b35fd455-32e4-4d52-b840-36aa28dd1910',
			name: 'Code',
		};

		const workflow = new Workflow({
			id: 'testWorkflow',
			name: 'testWorkflow',
			nodes: [
				{
					parameters: {},
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					id: 'a39a566a-283a-433e-88bc-b3857aab706f',
					name: 'ManualTrigger',
				},
				codeNode,
			],
			connections: {
				ManualTrigger: {
					main: [
						[
							{
								node: 'Code',
								type: NodeConnectionTypes.Main,
								index: 0,
							},
						],
					],
				},
			},
			active: true,
			nodeTypes: mock<INodeTypes>(),
		});

		const inputData: INodeExecutionData[] = [
			{
				json: {
					input: 'item',
				},
			},
		];

		const inputConnections: ITaskDataConnections = {
			main: [inputData],
		};

		const runExecutionData = createRunExecutionData({
			startData: {},
			resultData: {
				runData: {
					ManualTrigger: [
						{
							startTime: Date.now(),
							executionIndex: 0,
							executionTime: 0,
							executionStatus: 'success',
							source: [],
							data: {
								main: [inputData],
							},
						},
					],
				},
				lastNodeExecuted: 'ManualTrigger',
			},
			executionData: {
				contextData: {},
				nodeExecutionStack: [],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		});

		return {
			additionalData: mock<IWorkflowExecuteAdditionalData>({
				webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
				formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
			}),
			executeFunctions: mock<IExecuteFunctions>(),
			taskSettings,
			codeNode,
			workflow,
			inputData,
			inputConnections,
			runExecutionData,
			envProviderState: createEnvProviderState(),
		};
	};

	const runTaskWithCode = async (jsCode: string) => {
		const {
			additionalData,
			taskSettings,
			codeNode,
			workflow,
			inputData,
			inputConnections,
			runExecutionData,
			executeFunctions,
			envProviderState,
		} = newTaskData(jsCode);

		return await taskRequester.startTask<INodeExecutionData[], Error>(
			additionalData,
			'javascript',
			taskSettings,
			executeFunctions,
			inputConnections,
			codeNode,
			workflow,
			runExecutionData,
			0,
			0,
			codeNode.name,
			inputData,
			mock<INodeParameters>(),
			mock<WorkflowExecuteMode>(),
			envProviderState,
		);
	};

	describe('Basic code execution', () => {
		beforeAll(async () => {
			await taskRunnerModule.start();
		});

		afterAll(async () => {
			await taskRunnerModule.stop();
		});

		it('should execute a simple JS task', async () => {
			// Act
			const result = await runTaskWithCode('return { hello: "world" }');

			// Assert
			expect(result).toEqual({
				ok: true,
				result: { hello: 'world' },
			});
		});

		// CAT-3208 / GH #24307: secure-mode task runners disable code generation
		// (--disallow-code-generation-from-strings) and freeze Object.prototype, so
		// expressions can't be evaluated inside the Code node. $evaluateExpression
		// must surface a clear, actionable error instead of crashing with
		// "Cannot assign to read only property '__lookupGetter__'" or silently
		// returning null.
		it('should throw a clear error for $evaluateExpression in the Code node', async () => {
			// Act
			const result = await runTaskWithCode("return { val: $evaluateExpression('{{ 1 + 1 }}') }");

			// Assert
			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					message: expect.stringContaining(
						'in the Code node while task runners run in secure mode',
					),
				}),
			});
		});

		// The host's `Function.prototype` is reachable from user code
		// via `$input.constructor.constructor.prototype`, so it must be frozen
		// like the other host prototypes to keep its members immutable.
		it('should freeze the host Function.prototype so it cannot be mutated', async () => {
			// Act
			const result = await runTaskWithCode(`
				const hostFunctionPrototype = $input.constructor.constructor.prototype;
				const originalApply = hostFunctionPrototype.apply;
				let applyReassigned = false;
				let propertyAdded = false;
				try { hostFunctionPrototype.apply = function () {}; } catch (e) {}
				applyReassigned = hostFunctionPrototype.apply !== originalApply;
				try { hostFunctionPrototype.injected = 'value'; } catch (e) {}
				propertyAdded = hostFunctionPrototype.injected === 'value';
				return {
					frozen: Object.isFrozen(hostFunctionPrototype),
					applyReassigned,
					propertyAdded,
				};
			`);

			// Assert
			expect(result).toEqual({
				ok: true,
				result: {
					frozen: true,
					applyReassigned: false,
					propertyAdded: false,
				},
			});
		});
	});

	describe('Internal and external libs', () => {
		beforeAll(async () => {
			process.env.NODE_FUNCTION_ALLOW_BUILTIN = 'crypto';
			process.env.NODE_FUNCTION_ALLOW_EXTERNAL = 'moment';
			const { TaskBroker } = await import('@/task-runners/task-broker/task-broker.service.js');
			Container.get(TaskBroker).stopDraining();
			await taskRunnerModule.start();
		});

		afterAll(async () => {
			await taskRunnerModule.stop();
		});

		it('should allow importing allowed internal module', async () => {
			// Act
			const result = await runTaskWithCode(`
				const crypto = require("crypto");
				return {
					digest: crypto
						.createHmac("sha256", Buffer.from("MySecretKey"))
						.update("MESSAGE")
						.digest("base64")
				}
			`);

			expect(result).toEqual({
				ok: true,
				result: { digest: 'T09DMv7upNDKMD3Ht36FkwzrmWSgWpPiUNlcIX9/yaI=' },
			});
		});

		it('should not allow importing disallowed internal module', async () => {
			// Act
			const result = await runTaskWithCode(`
				const fs = require("fs");
				return { file: fs.readFileSync("test.txt") }
			`);

			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					message: "Module 'fs' is disallowed [line 2]",
				}),
			});
		});

		it('should allow importing allowed external module', async () => {
			// Act
			const result = await runTaskWithCode(`
				const moment = require("moment");
				return { time: moment("1995-12-25").format("YYYY-MM-DD") }
			`);

			expect(result).toEqual({
				ok: true,
				result: { time: '1995-12-25' },
			});
		});

		it('should not allow importing disallowed external module', async () => {
			// Act
			const result = await runTaskWithCode(`
				const lodash = require("lodash");
				return [{ obj: lodash.cloneDeep({}) }]
			`);

			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					message: "Module 'lodash' is disallowed [line 2]",
				}),
			});
		});

		// A host module object exposes the host's own reflection via its
		// constructor (`require('crypto').constructor.getPrototypeOf`), which
		// bypasses the sandbox's shimmed `Object.getPrototypeOf` and lets user
		// code walk a host object's prototype chain up to the internal
		// `EventEmitter` prototype.
		const walkToEventEmitterPrototype = `
			const crypto = require('crypto');
			const hostGetProto = crypto.constructor.getPrototypeOf;
			const hostGetOwnDesc = crypto.constructor.getOwnPropertyDescriptor;

			let proto = crypto.createHash('sha256');
			let emitterProto = null;
			for (let i = 0; i < 12; i++) {
				proto = hostGetProto(proto);
				if (!proto) break;
				if (hostGetOwnDesc(proto, 'emit') && hostGetOwnDesc(proto, 'on')) {
					emitterProto = proto;
					break;
				}
			}

			const methods = ['emit', 'on', 'once', 'addListener', 'prependListener', 'prependOnceListener'];
		`;

		// `process` inherits `emit` (and the listener registration methods) from
		// the internal `EventEmitter` prototype, so overriding one would
		// intercept a host `process.emit(...)` call, hand user code a reference
		// to `process`, and allow requiring arbitrary modules. Those members
		// must therefore stay immutable.
		it('should keep EventEmitter members reachable from host modules immutable', async () => {
			// Act
			const result = await runTaskWithCode(`
				${walkToEventEmitterPrototype}

				const overridden = [];
				for (const method of methods) {
					const original = emitterProto[method];
					try { emitterProto[method] = function () {}; } catch (e) {}
					if (emitterProto[method] !== original) overridden.push(method);
				}

				return {
					found: emitterProto !== null,
					overridden,
				};
			`);

			// Assert
			expect(result).toEqual({
				ok: true,
				result: {
					found: true,
					overridden: [],
				},
			});
		});

		// `EventEmitter.prototype` is shared by the whole process, so locking
		// these members must not make them non-enumerable: that would hide them
		// from `for...in`, `Object.keys` and spreads on every emitter, changing
		// behaviour host code and third-party modules already rely on.
		it('should keep locked EventEmitter members enumerable', async () => {
			// Act
			const result = await runTaskWithCode(`
				${walkToEventEmitterPrototype}

				const nonEnumerable = [];
				for (const method of methods) {
					if (!hostGetOwnDesc(emitterProto, method).enumerable) nonEnumerable.push(method);
				}

				return {
					found: emitterProto !== null,
					nonEnumerable,
				};
			`);

			// Assert
			expect(result).toEqual({
				ok: true,
				result: {
					found: true,
					nonEnumerable: [],
				},
			});
		});
	});
});
