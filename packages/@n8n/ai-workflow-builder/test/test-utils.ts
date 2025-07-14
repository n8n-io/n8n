import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { INode, INodeTypeDescription, INodeParameters, IConnection } from 'n8n-workflow';

import type { ProgressReporter } from '../src/types/tools';
import type { SimpleWorkflow } from '../src/types/workflow';

// Mock progress reporter with strong typing
export const mockProgress = (): MockProxy<ProgressReporter> => mock<ProgressReporter>();

// Mock state helpers - using regular jest mocks for simplicity but with proper typing
export const mockStateHelpers = () => ({
	getNodes: jest.fn(() => [] as INode[]),
	getConnections: jest.fn(() => ({}) as SimpleWorkflow['connections']),
	updateNode: jest.fn((_id: string, _updates: Partial<INode>) => undefined),
	addNodes: jest.fn((_nodes: INode[]) => undefined),
	removeNode: jest.fn((_id: string) => undefined),
	addConnections: jest.fn((_connections: IConnection[]) => undefined),
	removeConnection: jest.fn((_sourceId: string, _targetId: string, _type?: string) => undefined),
});

// Type for our mock state helpers
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
};

// Helper to create connections
export const createConnection = (
	_fromId: string,
	toId: string,
	type: string = 'main',
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
