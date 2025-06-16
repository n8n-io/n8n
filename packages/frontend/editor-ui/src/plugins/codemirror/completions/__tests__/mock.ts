import type { INode, IRunExecutionData, IExecuteData } from 'n8n-workflow';
import { WorkflowDataProxy } from 'n8n-workflow';
import { createTestWorkflowObject, mockNodes } from '@/__tests__/mocks';
import { mock } from 'vitest-mock-extended';

const runExecutionData: IRunExecutionData = {
	resultData: {
		runData: {
			Start: [
				{
					startTime: 1,
					executionIndex: 0,
					executionTime: 1,
					data: {
						main: [
							[
								{
									json: {},
								},
							],
						],
					},
					source: [],
				},
			],
			Function: [
				{
					startTime: 1,
					executionIndex: 1,
					executionTime: 1,
					data: {
						main: [
							[
								{
									json: { initialName: 105, str: 'abc' },
									pairedItem: { item: 0 },
								},
								{
									json: { initialName: 160 },
									pairedItem: { item: 0 },
								},
								{
									json: { initialName: 121 },
									pairedItem: { item: 0 },
								},
								{
									json: { initialName: 275 },
									pairedItem: { item: 0 },
								},
								{
									json: { initialName: 950 },
									pairedItem: { item: 0 },
								},
							],
						],
					},
					source: [
						{
							previousNode: 'Start',
						},
					],
				},
			],
			Rename: [
				{
					startTime: 1,
					executionIndex: 2,
					executionTime: 1,
					data: {
						main: [
							[
								{
									json: { data: 105 },
									pairedItem: { item: 0 },
								},
								{
									json: { data: 160 },
									pairedItem: { item: 1 },
								},
								{
									json: { data: 121 },
									pairedItem: { item: 2 },
								},
								{
									json: { data: 275 },
									pairedItem: { item: 3 },
								},
								{
									json: { data: 950 },
									pairedItem: { item: 4 },
								},
							],
						],
					},
					source: [
						{
							previousNode: 'Function',
						},
					],
				},
			],
			End: [
				{
					startTime: 1,
					executionIndex: 3,
					executionTime: 1,
					data: {
						main: [
							[
								{
									json: {
										data: 105,
										str: 'abc',
										num: 123,
										arr: [1, 2, 3],
										obj: { a: 'hello' },
									},
									pairedItem: { item: 0 },
								},
								{
									json: { data: 160 },
									pairedItem: { item: 1 },
								},
								{
									json: { data: 121 },
									pairedItem: { item: 2 },
								},
								{
									json: { data: 275 },
									pairedItem: { item: 3 },
								},
								{
									json: { data: 950 },
									pairedItem: { item: 4 },
								},
							],
						],
					},
					source: [
						{
							previousNode: 'Rename',
						},
					],
				},
			],
		},
	},
};

const workflow = createTestWorkflowObject({
	id: '123',
	name: 'test workflow',
	nodes: mockNodes,
	connections: mock(),
	active: false,
});

const lastNodeName = mockNodes[mockNodes.length - 1].name;

const lastNodeConnectionInputData =
	runExecutionData.resultData.runData[lastNodeName][0].data!.main[0];

const executeData: IExecuteData = {
	data: runExecutionData.resultData.runData[lastNodeName][0].data!,
	node: mockNodes.find((node) => node.name === lastNodeName) as INode,
	source: {
		main: runExecutionData.resultData.runData[lastNodeName][0].source,
	},
};

const dataProxy = new WorkflowDataProxy(
	workflow,
	runExecutionData,
	0,
	0,
	lastNodeName,
	lastNodeConnectionInputData || [],
	{},
	'manual',
	{},
	executeData,
);

export const mockProxy = dataProxy.getDataProxy();
