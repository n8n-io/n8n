import type { DataRequestResponse, TaskDataRequestParams } from '@n8n/task-runner';
import { mock } from 'jest-mock-extended';
import type { IWorkflowExecuteAdditionalData, INode, INodeExecutionData } from 'n8n-workflow';

import { DataRequestResponseStripper } from '../data-request-response-stripper';

const triggerNode: INode = mock<INode>({
	name: 'Trigger',
});
const debugHelperNode: INode = mock<INode>({
	name: 'DebugHelper',
});
const codeNode: INode = mock<INode>({
	name: 'Code',
});
const workflow: DataRequestResponse['workflow'] = mock<DataRequestResponse['workflow']>();
const debugHelperNodeOutItems: INodeExecutionData[] = [
	{
		json: {
			idx: 0,
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
	{
		json: {
			idx: 1,
			uid: '4620e4-c1b4-dd8b-9a45-d0f9a29a3b7f',
			email: 'bob.johnson@domain.com',
			firstName: 'Bob',
			lastName: 'Johnson',
			password: '6e41b5ecf',
		},
		pairedItem: {
			item: 1,
		},
	},
	{
		json: {
			idx: 2,
			email: '4358d3-418b-a8b3-49cb-076b1180f402',
			firstName: 'Eve',
			lastName: 'Johnson',
			password: 'e2414620e',
		},
		pairedItem: {
			item: 2,
		},
	},
];
const codeNodeInputItems: INodeExecutionData[] = debugHelperNodeOutItems;
const envProviderState: DataRequestResponse['envProviderState'] = mock<
	DataRequestResponse['envProviderState']
>({
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

/**
 * Drawn with https://asciiflow.com/#/
 * Task data for an execution of the following WF:
 * where ►► denotes the currently being executing node.
 *																			►►
 *	┌───────────┐   ┌─────────────┐    ┌────────┐
 *	│  Trigger  ├──►│ DebugHelper ├───►│  Code  │
 *	└───────────┘   └─────────────┘    └────────┘
 */
const taskData: DataRequestResponse = {
	workflow,
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
						executionIndex: 0,
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
						executionIndex: 1,
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
			waitingExecution: {},
			waitingExecutionSource: {},
		},
	},
	runIndex: 0,
	selfData: {},
	siblingParameters: {},
	connectionInputSource: {
		main: [
			{
				previousNode: debugHelperNode.name,
				previousNodeOutput: 0,
			},
		],
	},
	additionalData,
} as const;

describe('DataRequestResponseStripper', () => {
	const allDataParam: TaskDataRequestParams = {
		dataOfNodes: 'all',
		env: true,
		input: {
			include: true,
		},
		prevNode: true,
	};

	const newRequestParam = (opts: Partial<TaskDataRequestParams>) => ({
		...allDataParam,
		...opts,
	});

	describe('all data', () => {
		it('should build the runExecutionData as is when everything is requested', () => {
			const dataRequestResponseBuilder = new DataRequestResponseStripper(taskData, allDataParam);

			const { runExecutionData } = dataRequestResponseBuilder.strip();

			expect(runExecutionData).toStrictEqual(taskData.runExecutionData);
		});
	});

	describe('envProviderState', () => {
		it("should filter out envProviderState when it's not requested", () => {
			const dataRequestResponseBuilder = new DataRequestResponseStripper(
				taskData,
				newRequestParam({
					env: false,
				}),
			);

			const result = dataRequestResponseBuilder.strip();

			expect(result.envProviderState).toStrictEqual({
				env: {},
				isEnvAccessBlocked: false,
				isProcessAvailable: true,
			});
		});
	});

	describe('input data', () => {
		const allExceptInputParam = newRequestParam({
			input: {
				include: false,
			},
		});

		it('drops input data from result', () => {
			const result = new DataRequestResponseStripper(taskData, allExceptInputParam).strip();

			expect(result.inputData).toStrictEqual({});
		});

		it('returns only chunked data', () => {
			const result = new DataRequestResponseStripper(
				taskData,
				newRequestParam({
					input: {
						include: true,
						chunk: {
							startIndex: 1,
							count: 1,
						},
					},
				}),
			).strip();

			expect(result.inputData).toStrictEqual({
				main: [debugHelperNodeOutItems.slice(1, 2)],
			});
		});
	});

	describe('nodes', () => {
		it('should return empty run data when only Code node is requested', () => {
			const result = new DataRequestResponseStripper(
				taskData,
				newRequestParam({ dataOfNodes: ['Code'], prevNode: false }),
			).strip();

			expect(result.runExecutionData.resultData.runData).toStrictEqual({});
			expect(result.runExecutionData.resultData.pinData).toStrictEqual({});
			// executionData & startData contain only metadata --> returned as is
			expect(result.runExecutionData.startData).toStrictEqual(taskData.runExecutionData.startData);
			expect(result.runExecutionData.executionData).toStrictEqual(
				taskData.runExecutionData.executionData,
			);
		});

		it('should return empty run data when only Code node is requested', () => {
			const result = new DataRequestResponseStripper(
				taskData,
				newRequestParam({ dataOfNodes: [codeNode.name], prevNode: false }),
			).strip();

			expect(result.runExecutionData.resultData.runData).toStrictEqual({});
			expect(result.runExecutionData.resultData.pinData).toStrictEqual({});
			// executionData & startData contain only metadata --> returned as is
			expect(result.runExecutionData.startData).toStrictEqual(taskData.runExecutionData.startData);
			expect(result.runExecutionData.executionData).toStrictEqual(
				taskData.runExecutionData.executionData,
			);
		});

		it("should return only DebugHelper's data when only DebugHelper node is requested", () => {
			const result = new DataRequestResponseStripper(
				taskData,
				newRequestParam({ dataOfNodes: [debugHelperNode.name], prevNode: false }),
			).strip();

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
			const result = new DataRequestResponseStripper(
				taskData,
				newRequestParam({ dataOfNodes: [], prevNode: true }),
			).strip();

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

	describe('passthrough properties', () => {
		test.each<Array<keyof DataRequestResponse>>([
			['workflow'],
			['connectionInputSource'],
			['node'],
			['runIndex'],
			['itemIndex'],
			['activeNodeName'],
			['siblingParameters'],
			['mode'],
			['defaultReturnRunIndex'],
			['selfData'],
			['contextNodeName'],
			['additionalData'],
		])("it doesn't change %s", (propertyName) => {
			const dataRequestResponseBuilder = new DataRequestResponseStripper(taskData, allDataParam);

			const result = dataRequestResponseBuilder.strip();

			expect(result[propertyName]).toBe(taskData[propertyName]);
		});
	});
});
