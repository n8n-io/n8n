import type { TaskData } from '@n8n/task-runner';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { type INode, type INodeExecutionData, type Workflow } from 'n8n-workflow';

import { DataRequestResponseBuilder } from '../data-request-response-builder';

const triggerNode: INode = mock<INode>({
	name: 'Trigger',
});
const debugHelperNode: INode = mock<INode>({
	name: 'DebugHelper',
});
const codeNode: INode = mock<INode>({
	name: 'Code',
});
const workflow: TaskData['workflow'] = mock<Workflow>();
const debugHelperNodeOutItems: INodeExecutionData[] = [
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
const codeNodeInputItems: INodeExecutionData[] = debugHelperNodeOutItems;
const connectionInputData: TaskData['connectionInputData'] = codeNodeInputItems;
const envProviderState: TaskData['envProviderState'] = mock<TaskData['envProviderState']>({
	env: {},
	isEnvAccessBlocked: false,
	isProcessAvailable: true,
});
const additionalData = mock<IWorkflowExecuteAdditionalData>({
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
const executeFunctions = mock<IExecuteFunctions>();

/**
 * Drawn with https://asciiflow.com/#/
 * Task data for an execution of the following WF:
 * where ►► denotes the currently being executing node.
 *																			►►
 *	┌───────────┐   ┌─────────────┐    ┌────────┐
 *	│  Trigger  ├──►│ DebugHelper ├───►│  Code  │
 *	└───────────┘   └─────────────┘    └────────┘
 */
const taskData: TaskData = {
	executeFunctions,
	workflow,
	connectionInputData,
	inputData: {
		main: [codeNodeInputItems],
	},
	itemIndex: 0,
	activeNodeName: codeNode.name,
	contextNodeName: codeNode.name,
	defaultReturnRunIndex: -1,
	mode: 'manual',
	envProviderState,
	node: codeNode,
	runExecutionData: {
		startData: {
			destinationNode: codeNode.name,
			runNodeFilter: [triggerNode.name, debugHelperNode.name, codeNode.name],
		},
		resultData: {
			runData: {
				[triggerNode.name]: [
					{
						hints: [],
						startTime: 1730313407328,
						executionTime: 1,
						source: [],
						executionStatus: 'success',
						data: {
							main: [[]],
						},
					},
				],
				[debugHelperNode.name]: [
					{
						hints: [],
						startTime: 1730313407330,
						executionTime: 1,
						source: [
							{
								previousNode: triggerNode.name,
							},
						],
						executionStatus: 'success',
						data: {
							main: [debugHelperNodeOutItems],
						},
					},
				],
			},
			pinData: {},
		},
		executionData: {
			contextData: {},
			nodeExecutionStack: [],
			metadata: {},
			waitingExecution: {
				[codeNode.name]: {
					'0': {
						main: [codeNodeInputItems],
					},
				},
			},
			waitingExecutionSource: {
				[codeNode.name]: {
					'0': {
						main: [
							{
								previousNode: debugHelperNode.name,
							},
						],
					},
				},
			},
		},
	},
	runIndex: 0,
	selfData: {},
	siblingParameters: {},
	executeData: {
		node: codeNode,
		data: {
			main: [codeNodeInputItems],
		},
		source: {
			main: [
				{
					previousNode: debugHelperNode.name,
					previousNodeOutput: 0,
				},
			],
		},
	},
	additionalData,
} as const;

describe('DataRequestResponseBuilder', () => {
	const allDataParam: DataRequestResponseBuilder['requestParams'] = {
		dataOfNodes: 'all',
		env: true,
		input: true,
		prevNode: true,
	};

	const newRequestParam = (opts: Partial<DataRequestResponseBuilder['requestParams']>) => ({
		...allDataParam,
		...opts,
	});

	describe('all data', () => {
		it('should build the runExecutionData as is when everything is requested', () => {
			const dataRequestResponseBuilder = new DataRequestResponseBuilder(taskData, allDataParam);

			const { runExecutionData } = dataRequestResponseBuilder.build();

			expect(runExecutionData).toStrictEqual(taskData.runExecutionData);
		});
	});

	describe('envProviderState', () => {
		it("should filter out envProviderState when it's not requested", () => {
			const dataRequestResponseBuilder = new DataRequestResponseBuilder(
				taskData,
				newRequestParam({
					env: false,
				}),
			);

			const result = dataRequestResponseBuilder.build();

			expect(result.envProviderState).toStrictEqual({
				env: {},
				isEnvAccessBlocked: false,
				isProcessAvailable: true,
			});
		});
	});

	describe('additionalData', () => {
		it('picks only specific properties for additional data', () => {
			const dataRequestResponseBuilder = new DataRequestResponseBuilder(taskData, allDataParam);

			const result = dataRequestResponseBuilder.build();

			expect(result.additionalData).toStrictEqual({
				formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
				instanceBaseUrl: 'http://localhost:5678/',
				restApiUrl: 'http://localhost:5678/rest',
				webhookBaseUrl: 'http://localhost:5678/webhook',
				webhookTestBaseUrl: 'http://localhost:5678/webhook-test',
				webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
				executionId: '45844',
				userId: '114984bc-44b3-4dd4-9b54-a4a8d34d51d5',
				currentNodeParameters: undefined,
				executionTimeoutTimestamp: undefined,
				restartExecutionId: undefined,
				variables: additionalData.variables,
			});
		});
	});

	describe('input data', () => {
		const allExceptInputParam = newRequestParam({
			input: false,
		});

		it('drops input data from executeData', () => {
			const result = new DataRequestResponseBuilder(taskData, allExceptInputParam).build();

			expect(result.executeData).toStrictEqual({
				node: taskData.executeData!.node,
				source: taskData.executeData!.source,
				data: {},
			});
		});

		it('drops input data from result', () => {
			const result = new DataRequestResponseBuilder(taskData, allExceptInputParam).build();

			expect(result.inputData).toStrictEqual({});
		});

		it('drops input data from result', () => {
			const result = new DataRequestResponseBuilder(taskData, allExceptInputParam).build();

			expect(result.inputData).toStrictEqual({});
		});

		it('drops input data from connectionInputData', () => {
			const result = new DataRequestResponseBuilder(taskData, allExceptInputParam).build();

			expect(result.connectionInputData).toStrictEqual([]);
		});
	});

	describe('nodes', () => {
		it('should return empty run data when only Code node is requested', () => {
			const result = new DataRequestResponseBuilder(
				taskData,
				newRequestParam({ dataOfNodes: ['Code'], prevNode: false }),
			).build();

			expect(result.runExecutionData.resultData.runData).toStrictEqual({});
			expect(result.runExecutionData.resultData.pinData).toStrictEqual({});
			// executionData & startData contain only metadata --> returned as is
			expect(result.runExecutionData.startData).toStrictEqual(taskData.runExecutionData.startData);
			expect(result.runExecutionData.executionData).toStrictEqual(
				taskData.runExecutionData.executionData,
			);
		});

		it('should return empty run data when only Code node is requested', () => {
			const result = new DataRequestResponseBuilder(
				taskData,
				newRequestParam({ dataOfNodes: [codeNode.name], prevNode: false }),
			).build();

			expect(result.runExecutionData.resultData.runData).toStrictEqual({});
			expect(result.runExecutionData.resultData.pinData).toStrictEqual({});
			// executionData & startData contain only metadata --> returned as is
			expect(result.runExecutionData.startData).toStrictEqual(taskData.runExecutionData.startData);
			expect(result.runExecutionData.executionData).toStrictEqual(
				taskData.runExecutionData.executionData,
			);
		});

		it("should return only DebugHelper's data when only DebugHelper node is requested", () => {
			const result = new DataRequestResponseBuilder(
				taskData,
				newRequestParam({ dataOfNodes: [debugHelperNode.name], prevNode: false }),
			).build();

			expect(result.runExecutionData.resultData.runData).toStrictEqual({
				[debugHelperNode.name]: taskData.runExecutionData.resultData.runData[debugHelperNode.name],
			});
			expect(result.runExecutionData.resultData.pinData).toStrictEqual({});
			// executionData & startData contain only metadata --> returned as is
			expect(result.runExecutionData.startData).toStrictEqual(taskData.runExecutionData.startData);
			expect(result.runExecutionData.executionData).toStrictEqual(
				taskData.runExecutionData.executionData,
			);
		});

		it("should return DebugHelper's data when only prevNode node is requested", () => {
			const result = new DataRequestResponseBuilder(
				taskData,
				newRequestParam({ dataOfNodes: [], prevNode: true }),
			).build();

			expect(result.runExecutionData.resultData.runData).toStrictEqual({
				[debugHelperNode.name]: taskData.runExecutionData.resultData.runData[debugHelperNode.name],
			});
			expect(result.runExecutionData.resultData.pinData).toStrictEqual({});
			// executionData & startData contain only metadata --> returned as is
			expect(result.runExecutionData.startData).toStrictEqual(taskData.runExecutionData.startData);
			expect(result.runExecutionData.executionData).toStrictEqual(
				taskData.runExecutionData.executionData,
			);
		});
	});
});
