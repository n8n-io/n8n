import { TaskRunnersConfig } from '@n8n/config';
import { existsSync } from 'node:fs';
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

/**
 * End-to-end cover for the seam between n8n's import allowlist config and the
 * Python runner that enforces it: `N8N_RUNNERS_STDLIB_ALLOW` -> TaskRunnersConfig ->
 * spawned runner env -> the runner actually permitting (or rejecting) the import.
 *
 * The runner's own suite tests enforcement, and n8n's unit tests cover the config and
 * the messaging, but nothing joined the two — so a rename or a semantics change on
 * either side could pass both suites while leaving the builder describing a policy
 * that is not applied (INS-1222).
 *
 * Needs the runner's virtualenv (`uv sync` in packages/@n8n/task-runner-python).
 * Skipped rather than failed where it is absent, which is most Node CI lanes today.
 */
const venvPresent = existsSync(PyTaskRunnerProcess.getVenvPath());

describe.skipIf(!venvPresent)('Python TaskRunner execution on internal mode', () => {
	const runnerConfig = Container.get(TaskRunnersConfig);
	runnerConfig.mode = 'internal';
	runnerConfig.port = 45679;
	// The whole point of the test: the runner must enforce exactly this.
	runnerConfig.stdlibAllow = 'json';
	runnerConfig.externalAllow = '';

	const taskRunnerModule = Container.get(TaskRunnerModule);
	const taskRequester = Container.get(LocalTaskRequester);

	const runPythonCode = async (pythonCode: string) => {
		const inputData: INodeExecutionData[] = [{ json: { input: 'item' } }];

		const codeNode: INode = {
			parameters: { language: 'pythonNative', pythonCode },
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: [200, 80],
			id: 'c1a2b3d4-0000-4000-8000-00000000py01',
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
					id: 'c1a2b3d4-0000-4000-8000-00000000py02',
					name: 'ManualTrigger',
				},
				codeNode,
			],
			connections: {
				ManualTrigger: {
					main: [[{ node: 'Code', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
			active: true,
			nodeTypes: mock<INodeTypes>(),
		});

		// The Python runner receives its items with the task rather than over RPC.
		const taskSettings = {
			code: pythonCode,
			nodeMode: 'runOnceForAllItems',
			workflowMode: 'manual',
			continueOnFail: false,
			items: inputData,
			nodeId: codeNode.id,
			nodeName: codeNode.name,
			workflowId: workflow.id,
			workflowName: workflow.name,
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
							data: { main: [inputData] },
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

		return await taskRequester.startTask<INodeExecutionData[], Error>(
			mock<IWorkflowExecuteAdditionalData>({
				webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
				formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
			}),
			'python',
			taskSettings,
			mock<IExecuteFunctions>(),
			{ main: [inputData] } satisfies ITaskDataConnections,
			codeNode,
			workflow,
			runExecutionData,
			0,
			0,
			codeNode.name,
			inputData,
			mock<INodeParameters>(),
			mock<WorkflowExecuteMode>(),
			createEnvProviderState(),
		);
	};

	beforeAll(async () => {
		await taskRunnerModule.start();
	});

	afterAll(async () => {
		await taskRunnerModule.stop();
	});

	it('runs import-free Python', async () => {
		const result = await runPythonCode('return [{"json": {"hello": "world"}}]');

		expect(result).toEqual({ ok: true, result: [{ json: { hello: 'world' } }] });
	});

	it('permits an import the configured allowlist names', async () => {
		const result = await runPythonCode(
			'import json\nreturn [{"json": {"parsed": json.loads("{\\"a\\": 1}")}}]',
		);

		expect(result).toEqual({ ok: true, result: [{ json: { parsed: { a: 1 } } }] });
	});

	// The runner's static analyzer raises before execution, so the offending module
	// is carried on `description`; `message` is the generic violation headline.
	it('rejects an import the configured allowlist omits', async () => {
		const result = await runPythonCode('import re\nreturn [{"json": {}}]');

		expect(result).toMatchObject({
			ok: false,
			error: expect.objectContaining({
				description: expect.stringContaining(
					"Import of standard library module 're' is disallowed",
				),
			}),
		});
	});

	it('reports the configured allowlist back in the rejection', async () => {
		const result = await runPythonCode('import math\nreturn [{"json": {}}]');

		// Proves the runner is enforcing *this* config, not an empty default.
		expect(result).toMatchObject({
			ok: false,
			error: expect.objectContaining({
				description: expect.stringContaining('Allowed stdlib modules: json'),
			}),
		});
	});
});
