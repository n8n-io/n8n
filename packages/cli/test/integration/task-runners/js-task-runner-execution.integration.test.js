'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const local_task_requester_1 = require('@/task-runners/task-managers/local-task-requester');
const task_runner_module_1 = require('@/task-runners/task-runner-module');
describe('JS TaskRunner execution on internal mode', () => {
	const runnerConfig = di_1.Container.get(config_1.TaskRunnersConfig);
	runnerConfig.mode = 'internal';
	runnerConfig.enabled = true;
	runnerConfig.port = 45678;
	const taskRunnerModule = di_1.Container.get(task_runner_module_1.TaskRunnerModule);
	const taskRequester = di_1.Container.get(local_task_requester_1.LocalTaskRequester);
	const newTaskData = (jsCode) => {
		const taskSettings = {
			code: jsCode,
			nodeMode: 'runOnceForAllItems',
			workflowMode: 'manual',
			continueOnFail: false,
		};
		const codeNode = {
			parameters: {
				jsCode,
			},
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: [200, 80],
			id: 'b35fd455-32e4-4d52-b840-36aa28dd1910',
			name: 'Code',
		};
		const workflow = new n8n_workflow_1.Workflow({
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
								type: n8n_workflow_1.NodeConnectionTypes.Main,
								index: 0,
							},
						],
					],
				},
			},
			active: true,
			nodeTypes: (0, jest_mock_extended_1.mock)(),
		});
		const inputData = [
			{
				json: {
					input: 'item',
				},
			},
		];
		const inputConnections = {
			main: [inputData],
		};
		const runExecutionData = {
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
			additionalData: (0, jest_mock_extended_1.mock)(),
			executeFunctions: (0, jest_mock_extended_1.mock)(),
			taskSettings,
			codeNode,
			workflow,
			inputData,
			inputConnections,
			runExecutionData,
			envProviderState: (0, n8n_workflow_1.createEnvProviderState)(),
		};
	};
	const runTaskWithCode = async (jsCode) => {
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
		return await taskRequester.startTask(
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
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
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
			const result = await runTaskWithCode('return [{ hello: "world" }]');
			expect(result).toEqual({
				ok: true,
				result: [{ json: { hello: 'world' } }],
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
			const result = await runTaskWithCode(`
				const crypto = require("crypto");
				return [{
					digest: crypto
						.createHmac("sha256", Buffer.from("MySecretKey"))
						.update("MESSAGE")
						.digest("base64")
				}]
			`);
			expect(result).toEqual({
				ok: true,
				result: [{ json: { digest: 'T09DMv7upNDKMD3Ht36FkwzrmWSgWpPiUNlcIX9/yaI=' } }],
			});
		});
		it('should not allow importing disallowed internal module', async () => {
			const result = await runTaskWithCode(`
				const fs = require("fs");
				return [{ file: fs.readFileSync("test.txt") }]
			`);
			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					message: "Cannot find module 'fs' [line 2]",
				}),
			});
		});
		it('should allow importing allowed external module', async () => {
			const result = await runTaskWithCode(`
				const moment = require("moment");
				return [{ time: moment("1995-12-25").format("YYYY-MM-DD") }]
			`);
			expect(result).toEqual({
				ok: true,
				result: [{ json: { time: '1995-12-25' } }],
			});
		});
		it('should not allow importing disallowed external module', async () => {
			const result = await runTaskWithCode(`
				const lodash = require("lodash");
				return [{ obj: lodash.cloneDeep({}) }]
			`);
			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					message: "Cannot find module 'lodash' [line 2]",
				}),
			});
		});
	});
});
//# sourceMappingURL=js-task-runner-execution.integration.test.js.map
