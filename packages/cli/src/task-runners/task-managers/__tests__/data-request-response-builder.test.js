'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const data_request_response_builder_1 = require('../data-request-response-builder');
const additionalData = (0, jest_mock_extended_1.mock)({
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
const node = (0, jest_mock_extended_1.mock)();
const outputItems = [
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
const workflow = (0, jest_mock_extended_1.mock)({
	id: '1',
	name: 'Test Workflow',
	active: true,
	connectionsBySourceNode: {},
	nodes: {},
	pinData: {},
	settings: {},
	staticData: {},
});
const contextData = (0, jest_mock_extended_1.mock)();
const metadata = {
	0: [],
};
const runExecutionData = (0, jest_mock_extended_1.mock)({
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
				0: {
					main: [],
				},
			},
		},
		waitingExecutionSource: {},
	},
});
const taskData = (0, jest_mock_extended_1.mock)({
	additionalData,
	workflow,
	runExecutionData,
});
describe('DataRequestResponseBuilder', () => {
	const builder = new data_request_response_builder_1.DataRequestResponseBuilder();
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
//# sourceMappingURL=data-request-response-builder.test.js.map
