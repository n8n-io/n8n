import { rawCredentialValidator } from './raw-credential-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	credentials?: Record<string, unknown>,
	subnodes?: Record<string, unknown>,
): NodeInstance<string, string, unknown> {
	return {
		type: 'n8n-nodes-base.slack',
		name: 'Slack',
		version: '2',
		config: {
			parameters: {},
			...(credentials ? { credentials } : {}),
			...(subnodes ? { subnodes } : {}),
		},
	} as NodeInstance<string, string, unknown>;
}

function createGraphNode(node: NodeInstance<string, string, unknown>): GraphNode {
	return { instance: node, connections: new Map() };
}

function createContext(): PluginContext {
	return {
		nodes: new Map(),
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
	};
}

describe('rawCredentialValidator', () => {
	it('has correct id', () => {
		expect(rawCredentialValidator.id).toBe('core:raw-credential');
	});

	it('flags __aiGatewayManaged synthetic credentials', () => {
		const node = createMockNode({
			openAiApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
		});
		expect(
			rawCredentialValidator
				.validateNode(node, createGraphNode(node), createContext())
				.map((i) => i.code),
		).toEqual(['RAW_CREDENTIAL_OBJECT']);
	});

	it('flags mock-* credential ids', () => {
		const node = createMockNode({
			slackApi: { id: 'mock-slack-1', name: 'Slack' },
		});
		expect(
			rawCredentialValidator
				.validateNode(node, createGraphNode(node), createContext())
				.map((i) => i.code),
		).toEqual(['RAW_CREDENTIAL_OBJECT']);
	});

	it('allows newCredential() markers', () => {
		const node = createMockNode({
			slackApi: { __newCredential: true, name: 'My Slack' },
		});
		expect(
			rawCredentialValidator.validateNode(node, createGraphNode(node), createContext()),
		).toEqual([]);
	});

	it('allows real credential references', () => {
		const node = createMockNode({
			slackApi: { id: 'abc-123', name: 'Prod Slack' },
		});
		expect(
			rawCredentialValidator.validateNode(node, createGraphNode(node), createContext()),
		).toEqual([]);
	});

	it('flags forbidden credentials on subnodes', () => {
		const node = createMockNode(undefined, {
			model: {
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				name: 'Model',
				version: '1',
				config: {
					credentials: {
						openAiApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
					},
				},
			},
		});
		expect(
			rawCredentialValidator
				.validateNode(node, createGraphNode(node), createContext())
				.map((i) => i.code),
		).toEqual(['RAW_CREDENTIAL_OBJECT']);
	});
});
