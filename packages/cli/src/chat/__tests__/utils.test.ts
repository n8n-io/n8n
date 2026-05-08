import type { IExecutionResponse } from '@n8n/db';
import { TOOL_EXECUTOR_NODE_NAME } from '@n8n/constants';
import type { IDataObject, IExecuteData, INode, Workflow } from 'n8n-workflow';
import {
	CHAT_NODE_TYPE,
	CHAT_TOOL_NODE_TYPE,
	CHAT_WAIT_USER_REPLY,
	RESPOND_TO_WEBHOOK_NODE_TYPE,
	SEND_AND_WAIT_OPERATION,
} from 'n8n-workflow';

import {
	getMessage,
	getLastNodeExecuted,
	redirectIfToolExecutor,
	getLastNodeMessage,
	shouldResumeImmediately,
} from '../utils';

// helpers --------------------------------------------------------
const createMockExecution = (
	overrides: IDataObject = {},
	firstExecutionData?: IDataObject,
	nodeData?: IDataObject[],
): IExecutionResponse => {
	const firstItem = firstExecutionData ?? {
		json: { test: 'data' },
		sendMessage: 'Test message',
	};
	const nodeRunData = nodeData ?? [
		{
			data: {
				main: [[firstItem]],
			},
		},
	];

	return {
		id: 'test-execution-id',
		data: {
			resultData: {
				lastNodeExecuted: 'TestNode',
				runData: {
					TestNode: nodeRunData,
				},
			},
		},
		workflowData: {
			nodes: [
				{
					name: 'TestNode',
					type: 'test-node',
					parameters: {},
				},
			],
		},
		...overrides,
	} as unknown as IExecutionResponse;
};

const createMockNode = (overrides: Partial<INode> = {}): INode =>
	({
		name: 'TestNode',
		type: 'test-node',
		parameters: {},
		...overrides,
	}) as INode;

// ---------------------------------------------------------

describe('getMessage', () => {
	it('should return sendMessage from the last node execution', () => {
		const execution = createMockExecution();
		const result = getMessage(execution);
		expect(result).toBe('Test message');
	});

	it('should return undefined when no sendMessage exists', () => {
		const execution = createMockExecution(
			{},
			{
				json: { test: 'data' },
			},
		);
		const result = getMessage(execution);
		expect(result).toBeUndefined();
	});

	it('should return undefined when nodeExecutionData is empty', () => {
		const execution = createMockExecution({}, undefined, [
			{
				data: {
					main: [[]],
				},
			},
		]);
		const result = getMessage(execution);
		expect(result).toBeUndefined();
	});

	it('should handle multiple run data entries and use the last one', () => {
		const execution = createMockExecution({}, undefined, [
			{
				data: {
					main: [
						[
							{
								json: { test: 'first' },
								sendMessage: 'First message',
							},
						],
					],
				},
			},
			{
				data: {
					main: [
						[
							{
								json: { test: 'second' },
								sendMessage: 'Second message',
							},
						],
					],
				},
			},
		]);
		const result = getMessage(execution);
		expect(result).toBe('Second message');
	});

	it('should return undefined when main data is missing', () => {
		const execution = createMockExecution({}, undefined, [
			{
				data: {},
			},
		]);
		const result = getMessage(execution);
		expect(result).toBeUndefined();
	});

	it('should return undefined when nodeExecutionData is undefined', () => {
		const execution = createMockExecution({
			data: {
				resultData: {
					lastNodeExecuted: 'TestNode',
					runData: {
						TestNode: [
							{
								data: {
									main: undefined,
								},
							},
						],
					},
				},
			},
		});
		const result = getMessage(execution);
		expect(result).toBeUndefined();
	});

	it('should return message from the second output branch when first is empty', () => {
		const execution = createMockExecution({}, undefined, [
			{
				data: {
					main: [
						[], // First output branch is empty
						[
							{
								json: { test: 'data' },
								sendMessage: 'Message from second branch',
							},
						], // Second output branch has the message
					],
				},
			},
		]);
		const result = getMessage(execution);
		expect(result).toBe('Message from second branch');
	});

	it('should prioritize message from the first branch when multiple branches have messages', () => {
		const execution = createMockExecution({}, undefined, [
			{
				data: {
					main: [
						[
							{
								json: { test: 'data1' },
								sendMessage: 'Message from first branch',
							},
						],
						[
							{
								json: { test: 'data2' },
								sendMessage: 'Message from second branch',
							},
						],
					],
				},
			},
		]);
		const result = getMessage(execution);
		expect(result).toBe('Message from first branch');
	});

	it('should return sendMessage from ai_tool output when main is not available', () => {
		const execution = createMockExecution({}, undefined, [
			{
				data: {
					ai_tool: [
						[
							{
								json: { test: 'data' },
								sendMessage: 'Message from ai_tool',
							},
						],
					],
				},
			},
		]);
		const result = getMessage(execution);
		expect(result).toBe('Message from ai_tool');
	});

	it('should prioritize main output over ai_tool output when both exist', () => {
		const execution = createMockExecution({}, undefined, [
			{
				data: {
					main: [
						[
							{
								json: { test: 'main_data' },
								sendMessage: 'Message from main',
							},
						],
					],
					ai_tool: [
						[
							{
								json: { test: 'ai_data' },
								sendMessage: 'Message from ai_tool',
							},
						],
					],
				},
			},
		]);
		const result = getMessage(execution);
		expect(result).toBe('Message from main');
	});

	it('should return undefined when ai_tool output has no sendMessage', () => {
		const execution = createMockExecution({}, undefined, [
			{
				data: {
					ai_tool: [
						[
							{
								json: { test: 'data' },
							},
						],
					],
				},
			},
		]);
		const result = getMessage(execution);
		expect(result).toBeUndefined();
	});

	it('should return undefined when ai_tool output is empty', () => {
		const execution = createMockExecution({}, undefined, [
			{
				data: {
					ai_tool: [[]],
				},
			},
		]);
		const result = getMessage(execution);
		expect(result).toBeUndefined();
	});

	it('should handle multiple branches in ai_tool output', () => {
		const execution = createMockExecution({}, undefined, [
			{
				data: {
					ai_tool: [
						[], // First branch is empty
						[
							{
								json: { test: 'data' },
								sendMessage: 'Message from second ai_tool branch',
							},
						],
					],
				},
			},
		]);
		const result = getMessage(execution);
		expect(result).toBe('Message from second ai_tool branch');
	});
});

describe('getLastNodeExecuted', () => {
	it('should return the node that was last executed', () => {
		const execution = createMockExecution();
		const result = getLastNodeExecuted(execution);
		expect(result).toEqual({
			name: 'TestNode',
			type: 'test-node',
			parameters: {},
		});
	});

	it('should return undefined when last executed node is not found', () => {
		const execution = createMockExecution({
			data: {
				resultData: {
					lastNodeExecuted: 'NonExistentNode',
					runData: {},
				},
			},
		});
		const result = getLastNodeExecuted(execution);
		expect(result).toBeUndefined();
	});

	it('should find the correct node among multiple nodes', () => {
		const execution = createMockExecution({
			data: {
				resultData: {
					lastNodeExecuted: 'SecondNode',
					runData: {},
				},
			},
			workflowData: {
				nodes: [
					{
						name: 'FirstNode',
						type: 'first-type',
						parameters: {},
					},
					{
						name: 'SecondNode',
						type: 'second-type',
						parameters: { test: 'value' },
					},
				],
			},
		});
		const result = getLastNodeExecuted(execution);
		expect(result).toEqual({
			name: 'SecondNode',
			type: 'second-type',
			parameters: { test: 'value' },
		});
	});

	it('should return undefined when workflowData.nodes is undefined', () => {
		const execution = createMockExecution({
			workflowData: undefined,
		});
		const result = getLastNodeExecuted(execution);
		expect(result).toBeUndefined();
	});
});

describe('shouldResumeImmediately', () => {
	it('should return true for RESPOND_TO_WEBHOOK_NODE_TYPE', () => {
		const node = createMockNode({
			type: RESPOND_TO_WEBHOOK_NODE_TYPE,
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(true);
	});

	it('should return true when CHAT_WAIT_USER_REPLY is false', () => {
		const node = createMockNode({
			parameters: {
				options: {
					[CHAT_WAIT_USER_REPLY]: false,
				},
			},
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(true);
	});

	it('should return false when CHAT_WAIT_USER_REPLY is true', () => {
		const node = createMockNode({
			parameters: {
				options: {
					[CHAT_WAIT_USER_REPLY]: true,
				},
			},
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(false);
	});

	it('should return false when CHAT_WAIT_USER_REPLY is undefined', () => {
		const node = createMockNode({
			parameters: {
				options: {},
			},
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(false);
	});

	it('should return false when no options exist', () => {
		const node = createMockNode({
			parameters: {},
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(false);
	});

	it('should return false when no parameters exist', () => {
		const node = createMockNode({
			parameters: undefined,
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(false);
	});

	it('should handle null node', () => {
		const result = shouldResumeImmediately(null as any);
		expect(result).toBe(false);
	});

	it('should handle undefined node', () => {
		const result = shouldResumeImmediately(undefined as any);
		expect(result).toBe(false);
	});

	it('should return true when CHAT_WAIT_USER_REPLY is false directly in parameters', () => {
		const node = createMockNode({
			parameters: {
				[CHAT_WAIT_USER_REPLY]: false,
			},
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(true);
	});

	it('should return false when CHAT_WAIT_USER_REPLY is true directly in parameters', () => {
		const node = createMockNode({
			parameters: {
				[CHAT_WAIT_USER_REPLY]: true,
			},
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(false);
	});

	it('should return false when operation is SEND_AND_WAIT_OPERATION and node type is CHAT_NODE_TYPE', () => {
		const node = createMockNode({
			type: CHAT_NODE_TYPE,
			parameters: {
				operation: SEND_AND_WAIT_OPERATION,
			},
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(false);
	});

	it('should return false when operation is SEND_AND_WAIT_OPERATION and node type is CHAT_TOOL_NODE_TYPE', () => {
		const node = createMockNode({
			type: CHAT_TOOL_NODE_TYPE,
			parameters: {
				operation: SEND_AND_WAIT_OPERATION,
			},
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(false);
	});

	it('should return true when operation is not SEND_AND_WAIT_OPERATION and node type is CHAT_NODE_TYPE', () => {
		const node = createMockNode({
			type: CHAT_NODE_TYPE,
			parameters: {
				operation: 'send',
			},
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(true);
	});

	it('should return true operation is not SEND_AND_WAIT_OPERATION and node type is CHAT_TOOL_NODE_TYPE', () => {
		const node = createMockNode({
			type: CHAT_TOOL_NODE_TYPE,
			parameters: {
				operation: 'send',
			},
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(true);
	});
});

describe('redirectIfToolExecutor', () => {
	const toolNode: INode = {
		name: 'My Tool',
		type: 'n8n-nodes-base.myTool',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		id: 'tool-id',
		disabled: false,
	};

	function makeExecution(lastNodeExecuted: string, startData?: object): IExecutionResponse {
		return {
			id: 'exec-1',
			data: {
				resultData: { lastNodeExecuted, runData: {} },
				startData: startData ?? { runNodeFilter: ['SomeNode'], destinationNode: 'SomeNode' },
			},
			workflowData: { nodes: [] },
		} as unknown as IExecutionResponse;
	}

	function makeExecutionData(toolNodeName: string): IExecuteData {
		return {
			node: {
				name: TOOL_EXECUTOR_NODE_NAME,
				type: '@n8n/n8n-nodes-langchain.toolExecutor',
				parameters: { node: toolNodeName },
				typeVersion: 1,
				position: [0, 0],
				id: '',
				disabled: false,
			},
			data: { main: [[]] },
			source: null,
		} as unknown as IExecuteData;
	}

	it('returns null when lastNodeExecuted is not TOOL_EXECUTOR_NODE_NAME', () => {
		const execution = makeExecution('SomeOtherNode');
		const executionData = makeExecutionData('My Tool');
		const workflow = { getNode: jest.fn().mockReturnValue(toolNode) } as unknown as Workflow;

		const result = redirectIfToolExecutor(execution, executionData, workflow);

		expect(result).toBeNull();
		expect(workflow.getNode).not.toHaveBeenCalled();
	});

	it('returns null when the referenced tool node is not found in the workflow', () => {
		const execution = makeExecution(TOOL_EXECUTOR_NODE_NAME);
		const executionData = makeExecutionData('My Tool');
		const workflow = { getNode: jest.fn().mockReturnValue(null) } as unknown as Workflow;

		const result = redirectIfToolExecutor(execution, executionData, workflow);

		expect(result).toBeNull();
	});

	it('returns null when executionData.node.parameters.node is missing', () => {
		const execution = makeExecution(TOOL_EXECUTOR_NODE_NAME);
		const executionData = {
			node: { name: TOOL_EXECUTOR_NODE_NAME, parameters: {} },
			data: { main: [[]] },
			source: null,
		} as unknown as IExecuteData;
		const workflow = { getNode: jest.fn().mockReturnValue(null) } as unknown as Workflow;

		const result = redirectIfToolExecutor(execution, executionData, workflow);

		expect(result).toBeNull();
	});

	it('redirects executionData.node to the actual tool node', () => {
		const execution = makeExecution(TOOL_EXECUTOR_NODE_NAME);
		const executionData = makeExecutionData('My Tool');
		const workflow = { getNode: jest.fn().mockReturnValue(toolNode) } as unknown as Workflow;

		redirectIfToolExecutor(execution, executionData, workflow);

		expect(executionData.node).toBe(toolNode);
	});

	it('updates lastNodeExecuted to the tool node name', () => {
		const execution = makeExecution(TOOL_EXECUTOR_NODE_NAME);
		const executionData = makeExecutionData('My Tool');
		const workflow = { getNode: jest.fn().mockReturnValue(toolNode) } as unknown as Workflow;

		redirectIfToolExecutor(execution, executionData, workflow);

		expect(execution.data.resultData.lastNodeExecuted).toBe(toolNode.name);
	});

	it('resets runIndex to 0', () => {
		const execution = makeExecution(TOOL_EXECUTOR_NODE_NAME);
		const executionData = makeExecutionData('My Tool');
		(executionData as any).runIndex = 5;
		const workflow = { getNode: jest.fn().mockReturnValue(toolNode) } as unknown as Workflow;

		redirectIfToolExecutor(execution, executionData, workflow);

		expect((executionData as any).runIndex).toBe(0);
	});

	it('clears runNodeFilter and destinationNode from startData', () => {
		const execution = makeExecution(TOOL_EXECUTOR_NODE_NAME, {
			runNodeFilter: ['SomeNode'],
			destinationNode: 'SomeNode',
		});
		const executionData = makeExecutionData('My Tool');
		const workflow = { getNode: jest.fn().mockReturnValue(toolNode) } as unknown as Workflow;

		redirectIfToolExecutor(execution, executionData, workflow);

		expect(execution.data.startData?.runNodeFilter).toBeUndefined();
		expect(execution.data.startData?.destinationNode).toBeUndefined();
	});

	it('returns the tool node', () => {
		const execution = makeExecution(TOOL_EXECUTOR_NODE_NAME);
		const executionData = makeExecutionData('My Tool');
		const workflow = { getNode: jest.fn().mockReturnValue(toolNode) } as unknown as Workflow;

		const result = redirectIfToolExecutor(execution, executionData, workflow);

		expect(result).toBe(toolNode);
	});
});

// ---------------------------------------------------------

describe('getMessage (TOOL_EXECUTOR_NODE_NAME path)', () => {
	function makeToolExecutorExecution(
		toolNodeName: string,
		sendMessage: unknown,
		originalDestinationNode?: string | { nodeName: string },
	): IExecutionResponse {
		return {
			id: 'exec-tool',
			data: {
				resultData: {
					lastNodeExecuted: TOOL_EXECUTOR_NODE_NAME,
					runData: {
						[toolNodeName]: [
							{
								data: {
									ai_tool: [[{ json: { result: 'ok' }, sendMessage }]],
								},
							},
						],
					},
				},
				startData: originalDestinationNode ? { originalDestinationNode } : {},
			},
			workflowData: { nodes: [] },
		} as unknown as IExecutionResponse;
	}

	it('returns sendMessage from originalDestinationNode ai_tool run data (string reference)', () => {
		const execution = makeToolExecutorExecution('MyTool', 'Approve the action', 'MyTool');

		expect(getMessage(execution)).toBe('Approve the action');
	});

	it('returns sendMessage from originalDestinationNode ai_tool run data (object reference)', () => {
		const execution = makeToolExecutorExecution('MyTool', 'Approve the action', {
			nodeName: 'MyTool',
		});

		expect(getMessage(execution)).toBe('Approve the action');
	});

	it('returns sendMessage object with buttons from ai_tool run data', () => {
		const sendMessage = {
			type: 'with-buttons',
			text: 'Choose',
			blockUserInput: false,
			buttons: [{ label: 'Yes', value: 'yes', style: 'primary' }],
		};
		const execution = makeToolExecutorExecution('MyTool', sendMessage, 'MyTool');

		expect(getMessage(execution)).toEqual(sendMessage);
	});

	it('falls back to scanning all nodes when originalDestinationNode is not in runData', () => {
		const execution = makeToolExecutorExecution('MyTool', 'Fallback message');
		// No originalDestinationNode set — should scan all nodes

		expect(getMessage(execution)).toBe('Fallback message');
	});

	it('skips TOOL_EXECUTOR_NODE_NAME itself when scanning for sendMessage', () => {
		const execution = {
			id: 'exec-tool',
			data: {
				resultData: {
					lastNodeExecuted: TOOL_EXECUTOR_NODE_NAME,
					runData: {
						[TOOL_EXECUTOR_NODE_NAME]: [
							{ data: { ai_tool: [[{ json: {}, sendMessage: 'SHOULD NOT APPEAR' }]] } },
						],
						MyTool: [{ data: { ai_tool: [[{ json: {}, sendMessage: 'Real message' }]] } }],
					},
				},
				startData: {},
			},
			workflowData: { nodes: [] },
		} as unknown as IExecutionResponse;

		expect(getMessage(execution)).toBe('Real message');
	});

	it('returns undefined when no tool node has sendMessage', () => {
		const execution = {
			id: 'exec-tool',
			data: {
				resultData: {
					lastNodeExecuted: TOOL_EXECUTOR_NODE_NAME,
					runData: {
						MyTool: [{ data: { ai_tool: [[{ json: { result: 'ok' } }]] } }],
					},
				},
				startData: {},
			},
			workflowData: { nodes: [] },
		} as unknown as IExecutionResponse;

		expect(getMessage(execution)).toBeUndefined();
	});
});

// ---------------------------------------------------------

describe('getLastNodeExecuted (TOOL_EXECUTOR_NODE_NAME path)', () => {
	it('returns a synthetic node when lastNodeExecuted is TOOL_EXECUTOR_NODE_NAME', () => {
		const execution = {
			id: 'exec-tool',
			data: {
				resultData: {
					lastNodeExecuted: TOOL_EXECUTOR_NODE_NAME,
					runData: {},
				},
			},
			workflowData: { nodes: [] }, // virtual node is not in workflowData
		} as unknown as IExecutionResponse;

		const result = getLastNodeExecuted(execution);

		expect(result).toEqual({
			name: TOOL_EXECUTOR_NODE_NAME,
			type: '@n8n/n8n-nodes-langchain.toolExecutor',
			parameters: {},
			id: '',
			typeVersion: 1,
			position: [0, 0],
			disabled: false,
		});
	});

	it('prefers real workflow nodes over the synthetic fallback', () => {
		// If somehow TOOL_EXECUTOR_NODE_NAME is stored in workflowData.nodes, it should be returned directly
		const syntheticNode = {
			name: TOOL_EXECUTOR_NODE_NAME,
			type: 'real.type',
			parameters: { real: true },
		};
		const execution = {
			id: 'exec-tool',
			data: { resultData: { lastNodeExecuted: TOOL_EXECUTOR_NODE_NAME, runData: {} } },
			workflowData: { nodes: [syntheticNode] },
		} as unknown as IExecutionResponse;

		const result = getLastNodeExecuted(execution);

		expect(result).toEqual(syntheticNode);
	});
});

describe('getLastNodeMessage', () => {
	it('should return empty string when node type is not CHAT_NODE_TYPE', () => {
		const execution = createMockExecution();
		const node = createMockNode({ type: 'some-other-node-type' });
		const result = getLastNodeMessage(execution, node);
		expect(result).toBe('');
	});

	it('should return the message when node is CHAT_NODE_TYPE and execution has sendMessage', () => {
		const execution = createMockExecution();
		const node = createMockNode({ type: CHAT_NODE_TYPE });
		const result = getLastNodeMessage(execution, node);
		expect(result).toBe('Test message');
	});

	it('should return empty string when node is CHAT_NODE_TYPE but sendMessage is missing', () => {
		const execution = createMockExecution({}, { json: { data: 'test' } });
		const node = createMockNode({ type: CHAT_NODE_TYPE });
		const result = getLastNodeMessage(execution, node);
		expect(result).toBe('');
	});

	it('should return empty string when run data for the node is missing', () => {
		const execution = createMockExecution({
			data: {
				resultData: {
					lastNodeExecuted: 'TestNode',
					runData: {},
				},
			},
		});
		const node = createMockNode({ type: CHAT_NODE_TYPE });
		const result = getLastNodeMessage(execution, node);
		expect(result).toBe('');
	});

	it('should return empty string when main output is missing', () => {
		const execution = createMockExecution({}, undefined, [{ data: {} }]);
		const node = createMockNode({ type: CHAT_NODE_TYPE });
		const result = getLastNodeMessage(execution, node);
		expect(result).toBe('');
	});
});
