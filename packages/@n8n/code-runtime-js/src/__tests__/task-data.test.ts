import type { CodeTaskData } from '@n8n/code-task-contract';
import { createRunExecutionData, type INode, type INodeExecutionData } from 'n8n-workflow';

import { createTaskContext, runInTaskContext } from '../task-context';
import { createTaskData } from '../task-data';

const trigger: INode = {
	id: '1',
	name: 'Trigger',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};
const code: INode = { ...trigger, id: '2', name: 'Code', type: 'n8n-nodes-base.code' };

function newTaskData(items: INodeExecutionData[]): CodeTaskData {
	return {
		workflow: {
			id: 'wf',
			name: 'My workflow',
			active: false,
			nodes: [trigger, code],
			connections: { Trigger: { main: [[{ node: 'Code', type: 'main', index: 0 }]] } },
		},
		inputData: { main: [items] },
		connectionInputSource: { main: [{ previousNode: 'Trigger' }] },
		node: code,
		runExecutionData: createRunExecutionData({
			resultData: {
				runData: {
					Trigger: [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							data: { main: [items] },
						},
					],
				},
			},
		}),
		runIndex: 0,
		itemIndex: 0,
		activeNodeName: 'Code',
		siblingParameters: {},
		mode: 'manual',
		envProviderState: { env: {}, isEnvAccessBlocked: true, isProcessAvailable: true },
		defaultReturnRunIndex: -1,
		selfData: {},
		contextNodeName: 'Code',
		additionalData: {
			executionId: 'exec',
			restApiUrl: '',
			instanceBaseUrl: '',
			formWaitingBaseUrl: 'http://form',
			webhookBaseUrl: 'http://webhook',
			webhookWaitingBaseUrl: 'http://webhook-waiting',
			webhookTestBaseUrl: 'http://webhook-test',
			variables: { color: 'red' },
		},
	};
}

async function run(code: string, data: CodeTaskData) {
	const { getBuiltIns } = createTaskData({ data });
	return await runInTaskContext(code, createTaskContext(getBuiltIns(0)));
}

describe('createTaskData', () => {
	it('gives the code the input, other nodes, the workflow and the execution', async () => {
		const data = newTaskData([{ json: { a: 1 } }, { json: { a: 2 } }]);

		const result = await run(
			`return {
				json: $json.a,
				all: $input.all().map((item) => item.json.a),
				trigger: $('Trigger').last().json.a,
				workflow: $workflow.name,
				execution: [$execution.id, $execution.mode],
				vars: $vars.color,
			}`,
			data,
		);

		expect(result).toEqual({
			json: 1,
			all: [1, 2],
			trigger: 2,
			workflow: 'My workflow',
			execution: ['exec', 'test'],
			vars: 'red',
		});
	});

	it('keeps the index of the items in a chunk', async () => {
		const data = newTaskData([{ json: { a: 3 } }]);

		const { items, getBuiltIns } = createTaskData({ data, chunk: { startIndex: 2, count: 1 } });

		expect(items).toHaveLength(3);
		expect(getBuiltIns(2).$json).toEqual({ a: 3 });
	});
});
