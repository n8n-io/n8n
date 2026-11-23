import type {
	IExecuteData,
	IExecuteFunctions,
	INode,
	INodeType,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import {
	attachToolExpressionVariables,
	createEmptyRunExecutionData,
	NodeConnectionTypes,
	Workflow,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ExecuteContext } from '../../execute-context';

type DirectTool = { func: (args: object) => Promise<string> };

const parentNodeType: INodeType = {
	description: {
		displayName: 'Parent',
		name: 'parent',
		group: ['transform'],
		version: 1,
		description: '',
		defaults: { name: 'Parent' },
		inputs: [NodeConnectionTypes.Main, { type: NodeConnectionTypes.AiTool, maxConnections: 1 }],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	},
};

const toolNodeType: INodeType = {
	description: {
		displayName: 'Tool',
		name: 'tool',
		group: ['transform'],
		version: 1,
		description: '',
		defaults: { name: 'Tool' },
		inputs: [],
		outputs: [NodeConnectionTypes.AiTool],
		properties: [{ displayName: 'Value', name: 'value', type: 'string', default: '' }],
	},
	async execute(this: IExecuteFunctions) {
		return [[{ json: { value: this.getNodeParameter('value', 0) } }]];
	},
};

const parentNode: INode = {
	id: 'parent',
	name: 'Parent',
	type: 'test.parent',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const toolNode: INode = {
	id: 'tool',
	name: 'Tool',
	type: 'test.tool',
	typeVersion: 1,
	position: [0, 0],
	parameters: { value: '={{ $page?.number ?? "absent" }}' },
};

const getTool = async () => {
	const nodeTypes = mock<INodeTypes>({
		getByNameAndVersion: (type) => (type === toolNode.type ? toolNodeType : parentNodeType),
	});
	const workflow = new Workflow({
		id: 'wf',
		nodes: [parentNode, toolNode],
		connections: {
			[toolNode.name]: {
				[NodeConnectionTypes.AiTool]: [
					[{ node: parentNode.name, type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
		},
		active: false,
		nodeTypes,
	});
	const additionalData = mock<IWorkflowExecuteAdditionalData>();
	const executeData: IExecuteData = {
		data: { main: [[{ json: {} }]] },
		node: parentNode,
		source: null,
	};
	const context = new ExecuteContext(
		workflow,
		parentNode,
		additionalData,
		'manual',
		createEmptyRunExecutionData(),
		0,
		[{ json: {} }],
		{ main: [[{ json: {} }]] },
		executeData,
		[],
	);
	return (await context.getInputConnectionData(NodeConnectionTypes.AiTool, 0)) as DirectTool;
};

describe('tool expression variables', () => {
	it('resolves attached variables in the tool node parameters', async () => {
		const tool = await getTool();

		const result = await tool.func(attachToolExpressionVariables({}, { $page: { number: 3 } }));

		expect(JSON.parse(result)).toEqual([{ value: 3 }]);
	});

	it('leaves the variables undefined when none are attached', async () => {
		const tool = await getTool();

		const result = await tool.func({});

		expect(JSON.parse(result)).toEqual([{ value: 'absent' }]);
	});

	it('does not expose a same-named plain argument as a variable', async () => {
		const tool = await getTool();

		const result = await tool.func({ $page: { number: 3 } });

		expect(JSON.parse(result)).toEqual([{ value: 'absent' }]);
	});
});
