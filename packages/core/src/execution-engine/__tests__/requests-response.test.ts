import { mock } from 'jest-mock-extended';
import type { IExecuteData, IRunData, EngineRequest, INodeExecutionData } from 'n8n-workflow';

import { DirectedGraph } from '../partial-execution-utils';
import { createNodeData } from '../partial-execution-utils/__tests__/helpers';
import { handleRequest } from '../requests-response';
import { nodeTypes, types } from './mock-node-types';

describe('handleRequests', () => {
	test('throws if an action mentions a node that does not exist in the workflow', () => {
		// ARRANGE
		const request: EngineRequest = {
			actions: [
				{
					actionType: 'ExecutionNodeAction',
					nodeName: 'does not exist',
					input: { data: 'first node input' },
					type: 'ai_tool',
					id: 'first_action',
					metadata: {},
				},
			],
			metadata: {},
		};
		const currentNode = createNodeData({ name: 'trigger', type: types.passThrough });

		const workflow = new DirectedGraph()
			.addNodes(currentNode)
			.toWorkflow({ name: '', active: false, nodeTypes });
		// ACT

		// ASSERT
		expect(() =>
			handleRequest({
				workflow,
				currentNode,
				request,
				runIndex: 1,
				executionData: mock<IExecuteData>(),
				runData: mock<IRunData>(),
			}),
		).toThrowError('Workflow does not contain a node with the name of "does not exist".');
	});

	test('merges agent input data with tool parameters for expression resolution', () => {
		// ARRANGE
		const toolNode = createNodeData({ name: 'Gmail Tool', type: types.passThrough });
		const agentNode = createNodeData({ name: 'AI Agent', type: types.passThrough });

		const workflow = new DirectedGraph()
			.addNodes(toolNode, agentNode)
			.toWorkflow({ name: '', active: false, nodeTypes });

		// Agent received data from previous nodes with workflow context
		const agentInputData: INodeExecutionData[] = [
			{
				json: {
					myNewField: 1,
					price_total: '344.00',
					existingData: 'from workflow',
				},
			},
		];

		const executionData: IExecuteData = {
			data: {
				main: [agentInputData], // Agent's main input at index 0
			},
			source: {
				main: [
					{
						previousNode: 'Process Quotes',
						previousNodeOutput: 0,
						previousNodeRun: 0,
					},
				],
			},
			node: agentNode,
		};

		const request: EngineRequest = {
			actions: [
				{
					actionType: 'ExecutionNodeAction',
					nodeName: 'Gmail Tool',
					input: { subject: 'Test Email', toolParam: 'from LLM' }, // LLM-provided parameters
					type: 'ai_tool',
					id: 'tool_call_123',
					metadata: { itemIndex: 0 },
				},
			],
			metadata: {},
		};

		const runData: IRunData = {};

		// ACT
		const result = handleRequest({
			workflow,
			currentNode: agentNode,
			request,
			runIndex: 0,
			executionData,
			runData,
		});

		// ASSERT
		const toolNodeToExecute = result.nodesToBeExecuted.find((n) => n.parentNode === 'AI Agent');
		expect(toolNodeToExecute).toBeDefined();

		// Verify merged data contains both workflow data and tool parameters
		const mergedJson = toolNodeToExecute!.parentOutputData[0][0].json;
		expect(mergedJson).toEqual({
			myNewField: 1,
			price_total: '344.00',
			existingData: 'from workflow',
			subject: 'Test Email',
			toolParam: 'from LLM',
			toolCallId: 'tool_call_123',
		});

		// Verify tool parameters take precedence (override workflow data)
		const requestWithOverride: EngineRequest = {
			actions: [
				{
					actionType: 'ExecutionNodeAction',
					nodeName: 'Gmail Tool',
					input: { existingData: 'overridden by tool' }, // This should override workflow data
					type: 'ai_tool',
					id: 'tool_call_456',
					metadata: { itemIndex: 0 },
				},
			],
			metadata: {},
		};

		const runData2: IRunData = {};
		const result2 = handleRequest({
			workflow,
			currentNode: agentNode,
			request: requestWithOverride,
			runIndex: 0,
			executionData,
			runData: runData2,
		});

		const toolNodeToExecute2 = result2.nodesToBeExecuted.find((n) => n.parentNode === 'AI Agent');
		const mergedJson2 = toolNodeToExecute2!.parentOutputData[0][0].json;
		expect(mergedJson2.existingData).toBe('overridden by tool');
	});

	test('uses output index 0 for tools regardless of agent input connection', () => {
		// ARRANGE
		const toolNode = createNodeData({ name: 'Gmail Tool', type: types.passThrough });
		const agentNode = createNodeData({ name: 'AI Agent', type: types.passThrough });
		const switchNode = createNodeData({ name: 'Switch', type: types.passThrough });

		const workflow = new DirectedGraph()
			.addNodes(toolNode, agentNode, switchNode)
			.toWorkflow({ name: '', active: false, nodeTypes });

		// Agent is connected to output 2 of the Switch node
		const agentInputData: INodeExecutionData[] = [
			{
				json: {
					data: 'from switch output 2',
				},
			},
		];

		const executionData: IExecuteData = {
			data: {
				main: [agentInputData],
			},
			source: {
				main: [
					{
						previousNode: 'Switch',
						previousNodeOutput: 2, // Connected to Switch output 2
						previousNodeRun: 0,
					},
				],
			},
			node: agentNode,
		};

		const request: EngineRequest = {
			actions: [
				{
					actionType: 'ExecutionNodeAction',
					nodeName: 'Gmail Tool',
					input: { message: 'test' },
					type: 'ai_tool',
					id: 'tool_call_789',
					metadata: { itemIndex: 0 },
				},
			],
			metadata: {},
		};

		const runData: IRunData = {};

		// ACT
		const result = handleRequest({
			workflow,
			currentNode: agentNode,
			request,
			runIndex: 0,
			executionData,
			runData,
		});

		// ASSERT
		const toolNodeToExecute = result.nodesToBeExecuted.find((n) => n.parentNode === 'AI Agent');
		expect(toolNodeToExecute).toBeDefined();

		// Verify parentOutputIndex is always 0 for tools (agents have only one main output)
		// This prevents "Cannot read properties of undefined (reading 'map')" error
		expect(toolNodeToExecute!.parentOutputIndex).toBe(0);
	});

	test('handles multiple items correctly using itemIndex from metadata', () => {
		// ARRANGE
		const toolNode = createNodeData({ name: 'Gmail Tool', type: types.passThrough });
		const agentNode = createNodeData({ name: 'AI Agent', type: types.passThrough });

		const workflow = new DirectedGraph()
			.addNodes(toolNode, agentNode)
			.toWorkflow({ name: '', active: false, nodeTypes });

		// Agent received multiple items from previous nodes
		const agentInputData: INodeExecutionData[] = [
			{ json: { id: 1, value: 'first item' } },
			{ json: { id: 2, value: 'second item' } },
			{ json: { id: 3, value: 'third item' } },
		];

		const executionData: IExecuteData = {
			data: {
				main: [agentInputData],
			},
			source: {
				main: [
					{
						previousNode: 'Process Data',
						previousNodeOutput: 0,
						previousNodeRun: 0,
					},
				],
			},
			node: agentNode,
		};

		const request: EngineRequest = {
			actions: [
				{
					actionType: 'ExecutionNodeAction',
					nodeName: 'Gmail Tool',
					input: { toolParam: 'for second item' },
					type: 'ai_tool',
					id: 'tool_call_abc',
					metadata: { itemIndex: 1 }, // Processing second item
				},
			],
			metadata: {},
		};

		const runData: IRunData = {};

		// ACT
		const result = handleRequest({
			workflow,
			currentNode: agentNode,
			request,
			runIndex: 0,
			executionData,
			runData,
		});

		// ASSERT
		const toolNodeToExecute = result.nodesToBeExecuted.find((n) => n.parentNode === 'AI Agent');
		expect(toolNodeToExecute).toBeDefined();

		// Verify correct item data is merged (second item with id: 2)
		const mergedJson = toolNodeToExecute!.parentOutputData[0][0].json;
		expect(mergedJson.id).toBe(2);
		expect(mergedJson.value).toBe('second item');
		expect(mergedJson.toolParam).toBe('for second item');
	});

	test('preserves sourceOverwrite metadata for tool execution', () => {
		const toolNode = createNodeData({ name: 'Gmail Tool', type: types.passThrough });
		const agentNode = createNodeData({ name: 'AI Agent', type: types.passThrough });

		const workflow = new DirectedGraph()
			.addNodes(toolNode, agentNode)
			.toWorkflow({ name: '', active: false, nodeTypes });

		const agentInputData: INodeExecutionData[] = [
			{
				json: { data: 'test' },
			},
		];

		const executionData: IExecuteData = {
			data: {
				main: [agentInputData],
			},
			source: {
				main: [
					{
						previousNode: 'Process Quotes',
						previousNodeOutput: 0,
						previousNodeRun: 0,
					},
				],
			},
			node: agentNode,
		};

		const request: EngineRequest = {
			actions: [
				{
					actionType: 'ExecutionNodeAction',
					nodeName: 'Gmail Tool',
					input: { subject: 'Test' },
					type: 'ai_tool',
					id: 'tool_call_123',
					metadata: { itemIndex: 0 },
				},
			],
			metadata: {},
		};

		const runData: IRunData = {};

		const result = handleRequest({
			workflow,
			currentNode: agentNode,
			request,
			runIndex: 0,
			executionData,
			runData,
		});

		const toolNodeToExecute = result.nodesToBeExecuted.find((n) => n.parentNode === 'AI Agent');
		expect(toolNodeToExecute).toBeDefined();

		expect(toolNodeToExecute!.metadata).toHaveProperty('preserveSourceOverwrite', true);
		expect(toolNodeToExecute!.metadata).toHaveProperty('preservedSourceOverwrite');
		expect(toolNodeToExecute!.metadata!.preservedSourceOverwrite).toEqual({
			previousNode: 'Process Quotes',
			previousNodeOutput: 0,
			previousNodeRun: 0,
		});

		const pairedItem = toolNodeToExecute!.parentOutputData[0][0].pairedItem;
		expect(pairedItem).toHaveProperty('sourceOverwrite');
		if (typeof pairedItem === 'object' && 'sourceOverwrite' in pairedItem) {
			expect(pairedItem.sourceOverwrite).toEqual({
				previousNode: 'Process Quotes',
				previousNodeOutput: 0,
				previousNodeRun: 0,
			});
		}
	});

	test('preserves existing preservedSourceOverwrite from metadata', () => {
		const toolNode = createNodeData({ name: 'Gmail Tool', type: types.passThrough });
		const agentNode = createNodeData({ name: 'AI Agent', type: types.passThrough });

		const workflow = new DirectedGraph()
			.addNodes(toolNode, agentNode)
			.toWorkflow({ name: '', active: false, nodeTypes });

		const agentInputData: INodeExecutionData[] = [
			{
				json: { data: 'test' },
			},
		];

		const existingPreservedSource = {
			previousNode: 'Original Node',
			previousNodeOutput: 1,
			previousNodeRun: 2,
		};

		const executionData: IExecuteData = {
			data: {
				main: [agentInputData],
			},
			source: {
				main: [
					{
						previousNode: 'Immediate Parent',
						previousNodeOutput: 0,
						previousNodeRun: 0,
					},
				],
			},
			node: agentNode,
			metadata: {
				preservedSourceOverwrite: existingPreservedSource,
			},
		};

		const request: EngineRequest = {
			actions: [
				{
					actionType: 'ExecutionNodeAction',
					nodeName: 'Gmail Tool',
					input: { subject: 'Test' },
					type: 'ai_tool',
					id: 'tool_call_456',
					metadata: { itemIndex: 0 },
				},
			],
			metadata: {},
		};

		const runData: IRunData = {};

		const result = handleRequest({
			workflow,
			currentNode: agentNode,
			request,
			runIndex: 0,
			executionData,
			runData,
		});

		const toolNodeToExecute = result.nodesToBeExecuted.find((n) => n.parentNode === 'AI Agent');
		expect(toolNodeToExecute).toBeDefined();
		expect(toolNodeToExecute!.metadata!.preservedSourceOverwrite).toEqual(existingPreservedSource);
	});

	test('propagates preservedSourceOverwrite metadata when resuming agent', () => {
		const agentNode = createNodeData({ name: 'AI Agent', type: types.passThrough });

		const workflow = new DirectedGraph()
			.addNodes(agentNode)
			.toWorkflow({ name: '', active: false, nodeTypes });

		const preservedSource = {
			previousNode: 'Original Node',
			previousNodeOutput: 1,
			previousNodeRun: 2,
		};

		const executionData: IExecuteData = {
			data: {
				main: [
					[
						{
							json: { result: 'tool result' },
						},
					],
				],
			},
			source: {
				main: [
					{
						previousNode: 'Parent Node',
						previousNodeOutput: 0,
						previousNodeRun: 0,
					},
				],
			},
			node: agentNode,
			metadata: {
				preserveSourceOverwrite: true,
				preservedSourceOverwrite: preservedSource,
			},
		};

		const request: EngineRequest = {
			actions: [],
			metadata: {},
		};

		const runData: IRunData = {};

		const result = handleRequest({
			workflow,
			currentNode: agentNode,
			request,
			runIndex: 0,
			executionData,
			runData,
		});

		const resumingNode = result.nodesToBeExecuted[0];
		expect(resumingNode).toBeDefined();
		expect(resumingNode.metadata).toHaveProperty('nodeWasResumed', true);
		expect(resumingNode.metadata).toHaveProperty('preserveSourceOverwrite', true);
		expect(resumingNode.metadata).toHaveProperty('preservedSourceOverwrite', preservedSource);
	});

	test('does not add preserveSourceOverwrite metadata when not present', () => {
		const agentNode = createNodeData({ name: 'AI Agent', type: types.passThrough });

		const workflow = new DirectedGraph()
			.addNodes(agentNode)
			.toWorkflow({ name: '', active: false, nodeTypes });

		const executionData: IExecuteData = {
			data: {
				main: [
					[
						{
							json: { result: 'tool result' },
						},
					],
				],
			},
			source: {
				main: [
					{
						previousNode: 'Parent Node',
						previousNodeOutput: 0,
						previousNodeRun: 0,
					},
				],
			},
			node: agentNode,
		};

		const request: EngineRequest = {
			actions: [],
			metadata: {},
		};

		const runData: IRunData = {};

		const result = handleRequest({
			workflow,
			currentNode: agentNode,
			request,
			runIndex: 0,
			executionData,
			runData,
		});

		const resumingNode = result.nodesToBeExecuted[0];
		expect(resumingNode).toBeDefined();
		expect(resumingNode.metadata).toHaveProperty('nodeWasResumed', true);
		expect(resumingNode.metadata).not.toHaveProperty('preserveSourceOverwrite');
		expect(resumingNode.metadata).not.toHaveProperty('preservedSourceOverwrite');
	});
});
