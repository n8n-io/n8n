import { v4 as uuidv4 } from 'uuid';
import {
	INode,
	IConnections,
	IRunExecutionData,
	Workflow,
	IExecuteData,
	WorkflowDataProxy,
	INodeType,
	INodeTypeData,
	INodeTypes,
	IVersionedNodeType,
	NodeHelpers,
} from 'n8n-workflow';

class NodeTypesClass implements INodeTypes {
	nodeTypes: INodeTypeData = {
		'test.set': {
			sourcePath: '',
			type: {
				description: {
					displayName: 'Set',
					name: 'set',
					group: ['input'],
					version: 1,
					description: 'Sets a value',
					defaults: {
						name: 'Set',
						color: '#0000FF',
					},
					inputs: ['main'],
					outputs: ['main'],
					properties: [
						{
							displayName: 'Value1',
							name: 'value1',
							type: 'string',
							default: 'default-value1',
						},
						{
							displayName: 'Value2',
							name: 'value2',
							type: 'string',
							default: 'default-value2',
						},
					],
				},
			},
		},
	};

	getByName(nodeType: string): INodeType | IVersionedNodeType {
		return this.nodeTypes[nodeType].type;
	}

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		return NodeHelpers.getVersionedNodeType(this.nodeTypes[nodeType].type, version);
	}
}

const nodes: INode[] = [
	{
		name: 'Start',
		type: 'test.set',
		parameters: {},
		typeVersion: 1,
		id: 'uuid-1',
		position: [100, 200],
	},
	{
		name: 'Function',
		type: 'test.set',
		parameters: {
			functionCode:
				'// Code here will run only once, no matter how many input items there are.\n// More info and help: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.function/\nconst { DateTime, Duration, Interval } = require("luxon");\n\nconst data = [\n  {\n  "length": 105\n  },\n  {\n  "length": 160\n  },\n  {\n  "length": 121\n  },\n  {\n  "length": 275\n  },\n  {\n  "length": 950\n  },\n];\n\nreturn data.map(fact => ({json: fact}));',
		},
		typeVersion: 1,
		id: 'uuid-2',
		position: [280, 200],
	},
	{
		name: 'Rename',
		type: 'test.set',
		parameters: {
			value1: 'data',
			value2: 'initialName',
		},
		typeVersion: 1,
		id: 'uuid-3',
		position: [460, 200],
	},
	{
		name: 'End',
		type: 'test.set',
		parameters: {},
		typeVersion: 1,
		id: 'uuid-4',
		position: [640, 200],
	},
];

const connections: IConnections = {
	Start: {
		main: [
			[
				{
					node: 'Function',
					type: 'main',
					index: 0,
				},
			],
		],
	},
	Function: {
		main: [
			[
				{
					node: 'Rename',
					type: 'main',
					index: 0,
				},
			],
		],
	},
	Rename: {
		main: [
			[
				{
					node: 'End',
					type: 'main',
					index: 0,
				},
			],
		],
	},
};

const runExecutionData: IRunExecutionData = {
	resultData: {
		runData: {
			Start: [
				{
					startTime: 1,
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

const workflow = new Workflow({
	id: '123',
	name: 'test workflow',
	nodes,
	connections,
	active: false,
	nodeTypes: new NodeTypesClass(),
});

const lastNodeName = 'End';

const lastNodeConnectionInputData =
	runExecutionData.resultData.runData[lastNodeName][0].data!.main[0];

const executeData: IExecuteData = {
	data: runExecutionData.resultData.runData[lastNodeName][0].data!,
	node: nodes.find((node) => node.name === lastNodeName) as INode,
	source: {
		main: runExecutionData.resultData.runData[lastNodeName][0].source!,
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
	'America/New_York',
	{},
	executeData,
);

export const mockProxy = dataProxy.getDataProxy();

export const mockNodes = [
	{
		id: uuidv4(),
		name: 'Manual',
		position: [0, 0],
		type: 'n8n-nodes-base.manualTrigger',
		typeVersion: 1,
	},
	{
		id: uuidv4(),
		name: 'Set',
		position: [0, 0],
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
	},
];
