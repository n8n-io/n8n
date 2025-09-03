import { TaskRunnersConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type {
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeParameters,
	INodeTypes,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { createEnvProviderState, NodeConnectionTypes, Workflow } from 'n8n-workflow';

import { LocalTaskRequester } from '@/task-runners/task-managers/local-task-requester';
import { TaskRunnerModule } from '@/task-runners/task-runner-module';

/**
 * Integration tests for the JS TaskRunner execution. Starts the TaskRunner
 * as a child process and executes tasks on it via the broker.
 */
describe('JS TaskRunner execution on internal mode', () => {
	const runnerConfig = Container.get(TaskRunnersConfig);
	runnerConfig.mode = 'internal';
	runnerConfig.enabled = true;
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

		const runExecutionData: IRunExecutionData = {
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
		};

		return {
			additionalData: mock<IWorkflowExecuteAdditionalData>(),
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
	});

	describe('Internal and external libs', () => {
		beforeAll(async () => {
			process.env.NODE_FUNCTION_ALLOW_BUILTIN = 'crypto';
			process.env.NODE_FUNCTION_ALLOW_EXTERNAL = 'moment';
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
	});
});
