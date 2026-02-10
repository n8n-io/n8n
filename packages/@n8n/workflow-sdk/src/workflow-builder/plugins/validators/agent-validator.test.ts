import { agentValidator } from './agent-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

// Helper to create a mock node instance
function createMockNode(
	type: string,
	config: { parameters?: Record<string, unknown> } = {},
): NodeInstance<string, string, unknown> {
	return {
		type,
		name: 'Test Node',
		version: '1',
		config: {
			parameters: config.parameters ?? {},
		},
	} as NodeInstance<string, string, unknown>;
}

// Helper to create a mock graph node
function createGraphNode(node: NodeInstance<string, string, unknown>): GraphNode {
	return {
		instance: node,
		connections: new Map(),
	};
}

// Helper to create a mock plugin context
function createMockPluginContext(): PluginContext {
	return {
		nodes: new Map(),
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
	};
}

describe('agentValidator', () => {
	describe('metadata', () => {
		it('has correct id', () => {
			expect(agentValidator.id).toBe('core:agent');
		});

		it('has correct name', () => {
			expect(agentValidator.name).toBe('Agent Validator');
		});

		it('nodeTypes includes agent node type', () => {
			expect(agentValidator.nodeTypes).toContain('@n8n/n8n-nodes-langchain.agent');
		});
	});

	describe('validateNode', () => {
		it('returns AGENT_STATIC_PROMPT warning when promptType is define but text has no expression', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.agent', {
				parameters: { promptType: 'define', text: 'static text' },
			});
			const ctx = createMockPluginContext();

			const issues = agentValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'AGENT_STATIC_PROMPT',
					severity: 'warning',
				}),
			);
		});

		it('returns AGENT_STATIC_PROMPT warning when promptType is define and text is empty', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.agent', {
				parameters: { promptType: 'define', text: '' },
			});
			const ctx = createMockPluginContext();

			const issues = agentValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'AGENT_STATIC_PROMPT',
					severity: 'warning',
				}),
			);
		});

		it('returns no AGENT_STATIC_PROMPT warning when text contains expression', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.agent', {
				parameters: { promptType: 'define', text: '={{ $json.input }}' },
			});
			const ctx = createMockPluginContext();

			const issues = agentValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues.filter((i) => i.code === 'AGENT_STATIC_PROMPT')).toHaveLength(0);
		});

		it('returns AGENT_NO_SYSTEM_MESSAGE warning when options.systemMessage is empty', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.agent', {
				parameters: { promptType: 'define', text: '={{ $json.input }}', options: {} },
			});
			const ctx = createMockPluginContext();

			const issues = agentValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'AGENT_NO_SYSTEM_MESSAGE',
					severity: 'warning',
				}),
			);
		});

		it('returns AGENT_NO_SYSTEM_MESSAGE warning when options.systemMessage is whitespace-only', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.agent', {
				parameters: {
					promptType: 'define',
					text: '={{ $json.input }}',
					options: { systemMessage: '   ' },
				},
			});
			const ctx = createMockPluginContext();

			const issues = agentValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'AGENT_NO_SYSTEM_MESSAGE',
					severity: 'warning',
				}),
			);
		});

		it('returns no AGENT_NO_SYSTEM_MESSAGE warning when systemMessage is set', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.agent', {
				parameters: {
					promptType: 'define',
					text: '={{ $json.input }}',
					options: { systemMessage: 'You are a helpful assistant.' },
				},
			});
			const ctx = createMockPluginContext();

			const issues = agentValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues.filter((i) => i.code === 'AGENT_NO_SYSTEM_MESSAGE')).toHaveLength(0);
		});

		it('returns no AGENT_NO_SYSTEM_MESSAGE warning when systemMessage is at top level of params', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.agent', {
				parameters: {
					promptType: 'define',
					text: '={{ $json.input }}',
					systemMessage: 'You are a helpful assistant.',
				},
			});
			const ctx = createMockPluginContext();

			const issues = agentValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues.filter((i) => i.code === 'AGENT_NO_SYSTEM_MESSAGE')).toHaveLength(0);
		});

		it('returns no issues when promptType is auto', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.agent', {
				parameters: { promptType: 'auto' },
			});
			const ctx = createMockPluginContext();

			const issues = agentValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no issues when promptType is undefined (defaults to auto)', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.agent', {
				parameters: {},
			});
			const ctx = createMockPluginContext();

			const issues = agentValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no issues when promptType is guardrails', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.agent', {
				parameters: { promptType: 'guardrails' },
			});
			const ctx = createMockPluginContext();

			const issues = agentValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no issues when parameters is undefined', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.agent', {});
			const ctx = createMockPluginContext();

			const issues = agentValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('includes nodeName in issues', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.agent', {
				parameters: { promptType: 'define', text: 'static' },
			});
			// Override name using Object.assign to bypass readonly
			Object.assign(node, { name: 'My Agent' });
			const ctx = createMockPluginContext();

			const issues = agentValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues[0]?.nodeName).toBe('My Agent');
		});
	});
});
