import type { IDataObject, INode, INodeExecutionData, ITaskData } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import type { AllCodeTaskData, JSExecSettings } from '@/js-task-runner/js-task-runner';
import type { Task } from '@/task-runner';

/**
 * Creates a new task with the given settings
 */
export const newTaskWithSettings = (
	settings: Partial<JSExecSettings> & Pick<JSExecSettings, 'code' | 'nodeMode'>,
): Task<JSExecSettings> => ({
	taskId: '1',
	settings: {
		workflowMode: 'manual',
		continueOnFail: false,
		mode: 'manual',
		...settings,
	},
	active: true,
	cancelled: false,
});

/**
 * Creates a new node with the given options
 */
export const newNode = (opts: Partial<INode> = {}): INode => ({
	id: nanoid(),
	name: 'Test Node' + nanoid(),
	parameters: {},
	position: [0, 0],
	type: 'n8n-nodes-base.code',
	typeVersion: 1,
	...opts,
});

/**
 * Creates a new task data with the given options
 */
export const newTaskData = (opts: Partial<ITaskData> & Pick<ITaskData, 'source'>): ITaskData => ({
	startTime: Date.now(),
	executionTime: 0,
	executionStatus: 'success',
	...opts,
});

/**
 * Creates a new all code task data with the given options
 */
export const newAllCodeTaskData = (
	codeNodeInputData: INodeExecutionData[],
	opts: Partial<AllCodeTaskData> = {},
): AllCodeTaskData => {
	const codeNode = newNode({
		name: 'JsCode',
		parameters: {
			mode: 'runOnceForEachItem',
			language: 'javaScript',
			jsCode: 'return item',
		},
		type: 'n8n-nodes-base.code',
		typeVersion: 2,
	});
	const manualTriggerNode = newNode({
		name: 'Trigger',
		type: 'n8n-nodes-base.manualTrigger',
		parameters: {
			manualTriggerParam: 'empty',
		},
	});

	return {
		workflow: {
			id: '1',
			name: 'Test Workflow',
			active: true,
			connections: {
				[manualTriggerNode.name]: {
					main: [[{ node: codeNode.name, type: NodeConnectionType.Main, index: 0 }]],
				},
			},
			nodes: [manualTriggerNode, codeNode],
		},
		inputData: {
			main: [codeNodeInputData],
		},
		connectionInputData: codeNodeInputData,
		node: codeNode,
		runExecutionData: {
			startData: {},
			resultData: {
				runData: {
					[manualTriggerNode.name]: [
						newTaskData({
							source: [],
							data: {
								main: [codeNodeInputData],
							},
						}),
					],
				},
				pinData: {},
				lastNodeExecuted: manualTriggerNode.name,
			},
			executionData: {
				contextData: {},
				nodeExecutionStack: [],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		},
		runIndex: 0,
		itemIndex: 0,
		activeNodeName: codeNode.name,
		contextNodeName: codeNode.name,
		defaultReturnRunIndex: -1,
		siblingParameters: {},
		mode: 'manual',
		selfData: {},
		envProviderState: {
			env: {},
			isEnvAccessBlocked: true,
			isProcessAvailable: true,
		},
		additionalData: {
			executionId: 'exec-id',
			instanceBaseUrl: '',
			restartExecutionId: '',
			restApiUrl: '',
			formWaitingBaseUrl: 'http://formWaitingBaseUrl',
			webhookBaseUrl: 'http://webhookBaseUrl',
			webhookTestBaseUrl: 'http://webhookTestBaseUrl',
			webhookWaitingBaseUrl: 'http://webhookWaitingBaseUrl',
			variables: {
				var: 'value',
			},
		},
		executeData: {
			node: codeNode,
			data: {
				main: [codeNodeInputData],
			},
			source: {
				main: [{ previousNode: manualTriggerNode.name }],
			},
		},
		...opts,
	};
};

/**
 * Wraps the given value into an INodeExecutionData object's json property
 */
export const wrapIntoJson = (json: IDataObject): INodeExecutionData => ({
	json,
});

/**
 * Adds the given index as the pairedItem property to the given INodeExecutionData object
 */
export const withPairedItem = (index: number, data: INodeExecutionData): INodeExecutionData => ({
	...data,
	pairedItem: {
		item: index,
	},
});
