import type { ToolRunnableConfig } from '@langchain/core/tools';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { getCurrentTaskInput } from '@langchain/langgraph';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type {
	INode,
	INodeTypeDescription,
	INodeParameters,
	IConnection,
	NodeConnectionType,
} from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import type { ProgressReporter, ToolProgressMessage } from '../src/types/tools';
import type { SimpleWorkflow } from '../src/types/workflow';

export const mockProgress = (): MockProxy<ProgressReporter> => mock<ProgressReporter>();

// Mock state helpers
export const mockStateHelpers = () => ({
	getNodes: jest.fn(() => [] as INode[]),
	getConnections: jest.fn(() => ({}) as SimpleWorkflow['connections']),
	updateNode: jest.fn((_id: string, _updates: Partial<INode>) => undefined),
	addNodes: jest.fn((_nodes: INode[]) => undefined),
	removeNode: jest.fn((_id: string) => undefined),
	addConnections: jest.fn((_connections: IConnection[]) => undefined),
	removeConnection: jest.fn((_sourceId: string, _targetId: string, _type?: string) => undefined),
});

export type MockStateHelpers = ReturnType<typeof mockStateHelpers>;

// Simple node creation helper
export const createNode = (overrides: Partial<INode> = {}): INode => ({
	id: 'node1',
	name: 'TestNode',
	type: 'n8n-nodes-base.code',
	typeVersion: 1,
	position: [0, 0],
	...overrides,
	// Ensure parameters are properly merged if provided in overrides
	parameters: overrides.parameters ?? {},
});

// Simple workflow builder
export const createWorkflow = (nodes: INode[] = []): SimpleWorkflow => {
	const workflow: SimpleWorkflow = { nodes, connections: {} };
	return workflow;
};

// Create mock node type description
export const createNodeType = (
	overrides: Partial<INodeTypeDescription> = {},
): INodeTypeDescription => ({
	displayName: overrides.displayName ?? 'Test Node',
	name: overrides.name ?? 'test.node',
	group: overrides.group ?? ['transform'],
	version: overrides.version ?? 1,
	description: overrides.description ?? 'Test node description',
	defaults: overrides.defaults ?? { name: 'Test Node' },
	inputs: overrides.inputs ?? ['main'],
	outputs: overrides.outputs ?? ['main'],
	properties: overrides.properties ?? [],
	...overrides,
});

// Common node types for testing
export const nodeTypes = {
	code: createNodeType({
		displayName: 'Code',
		name: 'n8n-nodes-base.code',
		group: ['transform'],
		properties: [
			{
				displayName: 'JavaScript',
				name: 'jsCode',
				type: 'string',
				typeOptions: {
					editor: 'codeNodeEditor',
				},
				default: '',
			},
		],
	}),
	httpRequest: createNodeType({
		displayName: 'HTTP Request',
		name: 'n8n-nodes-base.httpRequest',
		group: ['input'],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Method',
				name: 'method',
				type: 'options',
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
				],
				default: 'GET',
			},
		],
	}),
	webhook: createNodeType({
		displayName: 'Webhook',
		name: 'n8n-nodes-base.webhook',
		group: ['trigger'],
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: 'webhook',
			},
		],
	}),
	agent: createNodeType({
		displayName: 'AI Agent',
		name: '@n8n/n8n-nodes-langchain.agent',
		group: ['output'],
		inputs: ['ai_agent'],
		outputs: ['main'],
		properties: [],
	}),
	openAiModel: createNodeType({
		displayName: 'OpenAI Chat Model',
		name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		group: ['output'],
		inputs: [],
		outputs: ['ai_languageModel'],
		properties: [],
	}),
	setNode: createNodeType({
		displayName: 'Set',
		name: 'n8n-nodes-base.set',
		group: ['transform'],
		properties: [
			{
				displayName: 'Values to Set',
				name: 'values',
				type: 'collection',
				default: {},
			},
		],
	}),
	ifNode: createNodeType({
		displayName: 'If',
		name: 'n8n-nodes-base.if',
		group: ['transform'],
		inputs: ['main'],
		outputs: ['main', 'main'],
		outputNames: ['true', 'false'],
		properties: [
			{
				displayName: 'Conditions',
				name: 'conditions',
				type: 'collection',
				default: {},
			},
		],
	}),
	mergeNode: createNodeType({
		displayName: 'Merge',
		name: 'n8n-nodes-base.merge',
		group: ['transform'],
		inputs: ['main', 'main'],
		outputs: ['main'],
		inputNames: ['Input 1', 'Input 2'],
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{ name: 'Append', value: 'append' },
					{ name: 'Merge By Index', value: 'mergeByIndex' },
					{ name: 'Merge By Key', value: 'mergeByKey' },
				],
				default: 'append',
			},
		],
	}),
	vectorStoreNode: createNodeType({
		displayName: 'Vector Store',
		name: '@n8n/n8n-nodes-langchain.vectorStore',
		subtitle: '={{$parameter["mode"] === "retrieve" ? "Retrieve" : "Insert"}}',
		group: ['transform'],
		inputs: `={{ ((parameter) => {
			function getInputs(parameters) {
				const mode = parameters?.mode;
				const inputs = [];
				if (mode === 'retrieve-as-tool') {
					inputs.push({
						displayName: 'Embedding',
						type: 'ai_embedding',
						required: true
					});
				} else {
					inputs.push({
						displayName: '',
						type: 'main'
					});
					inputs.push({
						displayName: 'Embedding',
						type: 'ai_embedding',
						required: true
					});
				}
				return inputs;
			};
			return getInputs(parameter)
		})($parameter) }}`,
		outputs: `={{ ((parameter) => {
			function getOutputs(parameters) {
				const mode = parameters?.mode;
				if (mode === 'retrieve-as-tool') {
					return ['ai_tool'];
				} else if (mode === 'retrieve') {
					return ['ai_document'];
				} else {
					return ['main'];
				}
			};
			return getOutputs(parameter)
		})($parameter) }}`,
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{ name: 'Insert', value: 'insert' },
					{ name: 'Retrieve', value: 'retrieve' },
					{ name: 'Retrieve (As Tool)', value: 'retrieve-as-tool' },
				],
				default: 'insert',
			},
			// Many more properties would be here in reality
		],
	}),
};

// Helper to create connections
export const createConnection = (
	_fromId: string,
	toId: string,
	type: NodeConnectionType = 'main',
	index: number = 0,
) => ({
	node: toId,
	type,
	index,
});

// Generic chain interface
interface Chain<TInput = Record<string, unknown>, TOutput = Record<string, unknown>> {
	invoke: (input: TInput) => Promise<TOutput>;
}

// Generic mock chain factory with proper typing
export const mockChain = <
	TInput = Record<string, unknown>,
	TOutput = Record<string, unknown>,
>(): MockProxy<Chain<TInput, TOutput>> => {
	return mock<Chain<TInput, TOutput>>();
};

// Convenience factory for parameter updater chain
export const mockParameterUpdaterChain = () => {
	return mockChain<Record<string, unknown>, { parameters: Record<string, unknown> }>();
};

// Helper to assert node parameters
export const expectNodeToHaveParameters = (
	node: INode,
	expectedParams: Partial<INodeParameters>,
): void => {
	expect(node.parameters).toMatchObject(expectedParams);
};

// Helper to assert connections exist
export const expectConnectionToExist = (
	connections: SimpleWorkflow['connections'],
	fromId: string,
	toId: string,
	type: string = 'main',
): void => {
	expect(connections[fromId]).toBeDefined();
	expect(connections[fromId][type]).toBeDefined();
	expect(connections[fromId][type]).toContainEqual(
		expect.arrayContaining([expect.objectContaining({ node: toId })]),
	);
};

// ========== LangGraph Testing Utilities ==========

// Types for mocked Command results
export type MockedCommandResult = { content: string };

// Common parsed content structure for tool results
export interface ParsedToolContent {
	update: {
		messages: Array<{ kwargs: { content: string } }>;
		workflowOperations?: Array<{
			type: string;
			nodes?: INode[];
			[key: string]: unknown;
		}>;
	};
}

// Setup LangGraph mocks
export const setupLangGraphMocks = () => {
	const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
		typeof getCurrentTaskInput
	>;

	jest.mock('@langchain/langgraph', () => ({
		getCurrentTaskInput: jest.fn(),
		Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
			content: JSON.stringify(params),
		})),
	}));

	return { mockGetCurrentTaskInput };
};

// Parse tool result with double-wrapped content handling
export const parseToolResult = <T = ParsedToolContent>(result: unknown): T => {
	const parsed = jsonParse<{ content?: string }>((result as MockedCommandResult).content);
	return parsed.content ? jsonParse<T>(parsed.content) : (parsed as T);
};

// ========== Progress Message Utilities ==========

// Extract progress messages from mockWriter
export const extractProgressMessages = (
	mockWriter: jest.Mock,
): Array<ToolProgressMessage<string>> => {
	const progressCalls: Array<ToolProgressMessage<string>> = [];

	mockWriter.mock.calls.forEach((call) => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const [arg] = call;
		progressCalls.push(arg as ToolProgressMessage<string>);
	});
	return progressCalls;
};

// Find specific progress message by type
export const findProgressMessage = (
	messages: Array<ToolProgressMessage<string>>,
	status: 'running' | 'completed' | 'error',
	updateType?: string,
): ToolProgressMessage<string> | undefined => {
	return messages.find(
		(msg) => msg.status === status && (!updateType || msg.updates[0]?.type === updateType),
	);
};

// ========== Tool Config Helpers ==========

// Create basic tool config
export const createToolConfig = (
	toolName: string,
	callId: string = 'test-call',
): ToolRunnableConfig => ({
	toolCall: { id: callId, name: toolName, args: {} },
});

// Create tool config with writer for progress tracking
export const createToolConfigWithWriter = (
	toolName: string,
	callId: string = 'test-call',
): ToolRunnableConfig & LangGraphRunnableConfig & { writer: jest.Mock } => {
	const mockWriter = jest.fn();
	return {
		toolCall: { id: callId, name: toolName, args: {} },
		writer: mockWriter,
	};
};

// ========== Workflow State Helpers ==========

// Setup workflow state with mockGetCurrentTaskInput
export const setupWorkflowState = (
	mockGetCurrentTaskInput: jest.MockedFunction<typeof getCurrentTaskInput>,
	workflow: SimpleWorkflow = createWorkflow([]),
) => {
	mockGetCurrentTaskInput.mockReturnValue({
		workflowJSON: workflow,
	});
};

// ========== Common Tool Assertions ==========

// Expect tool success message
export const expectToolSuccess = (
	content: ParsedToolContent,
	expectedMessage: string | RegExp,
): void => {
	const message = content.update.messages[0]?.kwargs.content;
	expect(message).toBeDefined();
	if (typeof expectedMessage === 'string') {
		expect(message).toContain(expectedMessage);
	} else {
		expect(message).toMatch(expectedMessage);
	}
};

// Expect tool error message
export const expectToolError = (
	content: ParsedToolContent,
	expectedError: string | RegExp,
): void => {
	const message = content.update.messages[0]?.kwargs.content;
	if (typeof expectedError === 'string') {
		expect(message).toBe(expectedError);
	} else {
		expect(message).toMatch(expectedError);
	}
};

// Expect workflow operation of specific type
export const expectWorkflowOperation = (
	content: ParsedToolContent,
	operationType: string,
	matcher?: Record<string, unknown>,
): void => {
	const operation = content.update.workflowOperations?.[0];
	expect(operation).toBeDefined();
	expect(operation?.type).toBe(operationType);
	if (matcher) {
		expect(operation).toMatchObject(matcher);
	}
};

// Expect node was added
export const expectNodeAdded = (content: ParsedToolContent, expectedNode: Partial<INode>): void => {
	expectWorkflowOperation(content, 'addNodes');
	const addedNode = content.update.workflowOperations?.[0]?.nodes?.[0];
	expect(addedNode).toBeDefined();
	expect(addedNode).toMatchObject(expectedNode);
};

// Expect node was removed
export const expectNodeRemoved = (content: ParsedToolContent, nodeId: string): void => {
	expectWorkflowOperation(content, 'removeNode', { nodeIds: [nodeId] });
};

// Expect connections were added
export const expectConnectionsAdded = (
	content: ParsedToolContent,
	expectedCount?: number,
): void => {
	expectWorkflowOperation(content, 'addConnections');
	if (expectedCount !== undefined) {
		const connections = content.update.workflowOperations?.[0]?.connections;
		expect(connections).toHaveLength(expectedCount);
	}
};

// Expect node was updated
export const expectNodeUpdated = (
	content: ParsedToolContent,
	nodeId: string,
	expectedUpdates?: Record<string, unknown>,
): void => {
	expectWorkflowOperation(content, 'updateNode', {
		nodeId,
		...(expectedUpdates ? { updates: expect.objectContaining(expectedUpdates) } : {}),
	});
};

// ========== Test Data Builders ==========

// Build add node input
export const buildAddNodeInput = (overrides: {
	nodeType: string;
	name?: string;
	connectionParametersReasoning?: string;
	connectionParameters?: Record<string, unknown>;
}) => ({
	nodeType: overrides.nodeType,
	name: overrides.name ?? 'Test Node',
	connectionParametersReasoning:
		overrides.connectionParametersReasoning ??
		'Standard node with static inputs/outputs, no connection parameters needed',
	connectionParameters: overrides.connectionParameters ?? {},
});

// Build connect nodes input
export const buildConnectNodesInput = (overrides: {
	sourceNodeId: string;
	targetNodeId: string;
	sourceOutputIndex?: number;
	targetInputIndex?: number;
}) => ({
	sourceNodeId: overrides.sourceNodeId,
	targetNodeId: overrides.targetNodeId,
	sourceOutputIndex: overrides.sourceOutputIndex ?? 0,
	targetInputIndex: overrides.targetInputIndex ?? 0,
});

// Build node search query
export const buildNodeSearchQuery = (
	queryType: 'name' | 'subNodeSearch',
	query?: string,
	connectionType?: NodeConnectionType,
) => ({
	queryType,
	...(query && { query }),
	...(connectionType && { connectionType }),
});

// Build update node parameters input
export const buildUpdateNodeInput = (nodeId: string, changes: string[]) => ({
	nodeId,
	changes,
});

// Build node details input
export const buildNodeDetailsInput = (overrides: {
	nodeName: string;
	withParameters?: boolean;
	withConnections?: boolean;
}) => ({
	nodeName: overrides.nodeName,
	withParameters: overrides.withParameters ?? false,
	withConnections: overrides.withConnections ?? true,
});

// Expect node details in response
export const expectNodeDetails = (
	content: ParsedToolContent,
	expectedDetails: Partial<{
		name: string;
		displayName: string;
		description: string;
		subtitle?: string;
	}>,
): void => {
	const message = content.update.messages[0]?.kwargs.content;
	expect(message).toBeDefined();

	// Check for expected XML-like tags in formatted output
	if (expectedDetails.name) {
		expect(message).toContain(`<name>${expectedDetails.name}</name>`);
	}
	if (expectedDetails.displayName) {
		expect(message).toContain(`<display_name>${expectedDetails.displayName}</display_name>`);
	}
	if (expectedDetails.description) {
		expect(message).toContain(`<description>${expectedDetails.description}</description>`);
	}
	if (expectedDetails.subtitle) {
		expect(message).toContain(`<subtitle>${expectedDetails.subtitle}</subtitle>`);
	}
};

// Helper to validate XML-like structure in output
export const expectXMLTag = (
	content: string,
	tagName: string,
	expectedValue?: string | RegExp,
): void => {
	const tagRegex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`);
	const match = content.match(tagRegex);
	expect(match).toBeDefined();
	if (expectedValue) {
		if (typeof expectedValue === 'string') {
			expect(match?.[1]?.trim()).toBe(expectedValue);
		} else {
			expect(match?.[1]).toMatch(expectedValue);
		}
	}
};

// Common reasoning strings
export const REASONING = {
	STATIC_NODE: 'Node has static inputs/outputs, no connection parameters needed',
	DYNAMIC_AI_NODE: 'AI node has dynamic inputs, setting connection parameters',
	TRIGGER_NODE: 'Trigger node, no connection parameters needed',
	WEBHOOK_NODE: 'Webhook is a trigger node, no connection parameters needed',
} as const;
