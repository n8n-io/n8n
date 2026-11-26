import {
	CODE_TASK_CONTRACT_VERSION,
	type CodeTaskData,
	type CodeTaskInput,
} from '@n8n/code-task-contract';
import { createRunExecutionData, type INode, type INodeExecutionData } from 'n8n-workflow';

const trigger: INode = {
	id: '1',
	name: 'Trigger',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};
const code: INode = { ...trigger, id: '2', name: 'Code', type: 'n8n-nodes-base.code' };

export function newTaskData(items: INodeExecutionData[]): CodeTaskData {
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

/** A task that runs `code` once for all `items`. */
export function newTaskInput(code: string, items: INodeExecutionData[] = []): CodeTaskInput {
	return {
		version: CODE_TASK_CONTRACT_VERSION,
		taskId: 'task',
		language: 'javascript',
		code,
		nodeMode: 'runOnceForAllItems',
		continueOnFail: false,
		data: newTaskData(items),
	};
}
