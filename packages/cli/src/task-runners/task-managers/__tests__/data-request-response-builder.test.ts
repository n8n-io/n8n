import type { PartialAdditionalData, TaskData } from '@n8n/task-runner';
import { mock } from 'jest-mock-extended';
import type {
	IExecuteContextData,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	Workflow,
} from 'n8n-workflow';

import { DataRequestResponseBuilder } from '../data-request-response-builder';

const additionalData = mock<PartialAdditionalData>({
	formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
	instanceBaseUrl: 'http://localhost:5678/',
	restApiUrl: 'http://localhost:5678/rest',
	variables: {},
	webhookBaseUrl: 'http://localhost:5678/webhook',
	webhookTestBaseUrl: 'http://localhost:5678/webhook-test',
	webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
	executionId: '45844',
	userId: '114984bc-44b3-4dd4-9b54-a4a8d34d51d5',
	currentNodeParameters: undefined,
	executionTimeoutTimestamp: undefined,
	restartExecutionId: undefined,
});

const node = mock<INode>();
const outputItems: INodeExecutionData[] = [
	{
		json: {
			uid: 'abb74fd4-bef2-4fae-9d53-ea24e9eb3032',
			email: 'Dan.Schmidt31@yahoo.com',
			firstname: 'Toni',
			lastname: 'Schuster',
			password: 'Q!D6C2',
		},
		pairedItem: {
			item: 0,
		},
	},
];

const workflow: TaskData['workflow'] = mock<Workflow>({
	id: '1',
	name: 'Test Workflow',
	active: true,
	connectionsBySourceNode: {},
	nodes: {},
	pinData: {},
	settings: {},
	staticData: {},
});

const contextData = mock<IExecuteContextData>();
const metadata = {
	'0': [],
};

const runExecutionData = mock<IRunExecutionData>({
	executionData: {
		contextData,
		metadata,
		nodeExecutionStack: [
			{
				node,
				data: {
					main: [outputItems],
				},
				source: {},
			},
		],
		waitingExecution: {
			node: {
				'0': {
					main: [],
				},
			},
		},
		waitingExecutionSource: {},
	},
});

const taskData = mock<TaskData>({
	additionalData,
	workflow,
	runExecutionData,
});

describe('DataRequestResponseBuilder', () => {
	const builder = new DataRequestResponseBuilder();

	it('picks only specific properties for additional data', () => {
		const result = builder.buildFromTaskData(taskData);

		expect(result.additionalData).toStrictEqual({
			formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
			instanceBaseUrl: 'http://localhost:5678/',
			restApiUrl: 'http://localhost:5678/rest',
			variables: additionalData.variables,
			webhookBaseUrl: 'http://localhost:5678/webhook',
			webhookTestBaseUrl: 'http://localhost:5678/webhook-test',
			webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
			executionId: '45844',
			userId: '114984bc-44b3-4dd4-9b54-a4a8d34d51d5',
			currentNodeParameters: undefined,
			executionTimeoutTimestamp: undefined,
			restartExecutionId: undefined,
		});
	});

	it('picks only specific properties for workflow', () => {
		const result = builder.buildFromTaskData(taskData);

		expect(result.workflow).toStrictEqual({
			id: '1',
			name: 'Test Workflow',
			active: true,
			connections: workflow.connectionsBySourceNode,
			nodes: [],
			pinData: workflow.pinData,
			settings: workflow.settings,
			staticData: workflow.staticData,
		});
	});

	it('clears nodeExecutionStack, waitingExecution and waitingExecutionSource from runExecutionData', () => {
		const result = builder.buildFromTaskData(taskData);

		expect(result.runExecutionData).toStrictEqual({
			startData: runExecutionData.startData,
			resultData: runExecutionData.resultData,
			executionData: {
				contextData,
				metadata,
				nodeExecutionStack: [],
				waitingExecution: {},
				waitingExecutionSource: null,
			},
		});
	});
});
