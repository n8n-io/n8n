import { agentModelPairingValidator } from './agent-model-pairing-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createAgent(subnodes?: Record<string, unknown>): NodeInstance<string, string, unknown> {
	return {
		type: '@n8n/n8n-nodes-langchain.agent',
		name: 'Agent',
		version: '2.1',
		config: { parameters: {}, subnodes },
	} as NodeInstance<string, string, unknown>;
}

function ctx(): PluginContext {
	return { nodes: new Map(), workflowId: 't', workflowName: 'T', settings: {} };
}

describe('agentModelPairingValidator', () => {
	it('flags missing model subnode', () => {
		const node = createAgent();
		expect(
			agentModelPairingValidator
				.validateNode(node, { instance: node, connections: new Map() } as GraphNode, ctx())
				.map((i) => i.code),
		).toEqual(['AGENT_MODEL_PAIRING']);
	});

	it('flags deprecated lmOpenAi', () => {
		const node = createAgent({
			model: {
				type: '@n8n/n8n-nodes-langchain.lmOpenAi',
				name: 'OpenAI',
				version: '1',
				config: {},
			},
		});
		expect(
			agentModelPairingValidator
				.validateNode(node, { instance: node, connections: new Map() } as GraphNode, ctx())
				.map((i) => i.code),
		).toContain('AGENT_MODEL_PAIRING');
	});

	it('accepts lmChatOpenAi', () => {
		const node = createAgent({
			model: {
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				name: 'OpenAI Chat',
				version: '1.3',
				config: {},
			},
		});
		expect(
			agentModelPairingValidator.validateNode(
				node,
				{ instance: node, connections: new Map() } as GraphNode,
				ctx(),
			),
		).toEqual([]);
	});
});
