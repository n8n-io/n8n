import type { CodeTaskRequest } from '@n8n/backend-services';
import { parseCodeTaskInput } from '@n8n/code-task-contract';
import {
	createRunExecutionData,
	type IExecuteFunctions,
	type INode,
	type INodeExecutionData,
	type INodeTypes,
	type IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { buildTaskInput, MAX_TASK_INPUT_BYTES } from '../task-builder';

const trigger: INode = {
	id: '1',
	name: 'Trigger',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};
const code: INode = { ...trigger, id: '2', name: 'Code', type: 'n8n-nodes-base.code' };

function newRequest(
	settings: Record<string, unknown>,
	items: INodeExecutionData[] = [{ json: { a: 1 } }],
): CodeTaskRequest {
	const workflow = new Workflow({
		id: 'wf',
		name: 'My workflow',
		nodes: [trigger, code],
		connections: { Trigger: { main: [[{ node: 'Code', type: 'main', index: 0 }]] } },
		active: false,
		nodeTypes: mock<INodeTypes>(),
		staticData: { global: { cursor: 1 } },
	});
	const runExecutionData = createRunExecutionData({
		resultData: {
			runData: {
				Trigger: [
					{
						startTime: 0,
						executionTime: 1,
						executionIndex: 0,
						source: [],
						data: { main: [items] },
					},
				],
			},
		},
		executionData: {
			nodeExecutionStack: [{ node: code, data: { main: [items] }, source: null }],
		},
	});

	return {
		// `hooks` belongs to the engine, so the builder must drop it
		additionalData: {
			executionId: 'exec',
			restApiUrl: 'http://localhost:5678/rest',
			instanceBaseUrl: 'http://localhost:5678/',
			formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
			webhookBaseUrl: 'http://localhost:5678/webhook',
			webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
			webhookTestBaseUrl: 'http://localhost:5678/webhook-test',
			variables: { color: 'red' },
			hooks: { secret: 'engine' },
		} as unknown as IWorkflowExecuteAdditionalData,
		taskType: 'javascript',
		settings: { workflowMode: 'manual', continueOnFail: false, ...settings },
		executeFunctions: mock<IExecuteFunctions>(),
		inputData: { main: [items] },
		node: code,
		workflow,
		runExecutionData,
		runIndex: 0,
		itemIndex: 0,
		activeNodeName: 'Code',
		connectionInputData: items,
		siblingParameters: {},
		mode: 'manual',
		envProviderState: { env: {}, isEnvAccessBlocked: true, isProcessAvailable: true },
		executeData: {
			node: code,
			data: { main: [items] },
			source: { main: [{ previousNode: 'Trigger' }] },
		},
	};
}

function parse(content: Buffer) {
	const parsed = parseCodeTaskInput(JSON.parse(content.toString()));
	if (!parsed.ok) throw parsed.error;
	return parsed.result;
}

describe('buildTaskInput', () => {
	it('builds a task input that the runtime accepts, with the data that the code can read', () => {
		const request = newRequest({ code: 'return items', nodeMode: 'runOnceForAllItems' });

		const input = parse(buildTaskInput('task-1', request));

		expect(input).toMatchObject({
			taskId: 'task-1',
			code: 'return items',
			nodeMode: 'runOnceForAllItems',
			data: {
				workflow: { id: 'wf', staticData: { global: { cursor: 1 } } },
				inputData: { main: [[{ json: { a: 1 } }]] },
				connectionInputSource: { main: [{ previousNode: 'Trigger' }] },
				contextNodeName: 'Code',
			},
		});
		expect(input.data.workflow.nodes.map((node) => node.name)).toEqual(['Trigger', 'Code']);
		expect(input.data.runExecutionData.resultData.runData.Trigger).toHaveLength(1);
		expect(input.data.runExecutionData.executionData?.nodeExecutionStack).toEqual([]);
		expect(input.data.additionalData).not.toHaveProperty('hooks');
	});

	it('sends only the items of the chunk', () => {
		const items = [1, 2, 3, 4].map((a) => ({ json: { a } }));
		const request = newRequest(
			{ code: 'return $json', nodeMode: 'runOnceForEachItem', chunk: { startIndex: 1, count: 2 } },
			items,
		);

		const input = parse(buildTaskInput('task-1', request));

		expect(input.chunk).toEqual({ startIndex: 1, count: 2 });
		expect(input.data.inputData.main).toEqual([[{ json: { a: 2 } }, { json: { a: 3 } }]]);
	});

	it('rejects a task input that is too large for the code sandbox', () => {
		const request = newRequest({ code: 'return items', nodeMode: 'runOnceForAllItems' }, [
			{ json: { text: 'x'.repeat(MAX_TASK_INPUT_BYTES) } },
		]);

		expect(() => buildTaskInput('task-1', request)).toThrow(
			'The data of node "Code" is too large for the code sandbox. The max is 64 MiB.',
		);
	});

	it('rejects a Python task', () => {
		const request = { ...newRequest({ code: 'return []' }), taskType: 'python' };

		expect(() => buildTaskInput('task-1', request)).toThrow(
			'The code sandbox cannot run python code yet',
		);
	});
});
