import { memoryFromInputValidator } from './memory-from-input-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	type: string,
	name: string,
	config: { parameters?: Record<string, unknown> } = {},
	subnodeType?: string,
): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: '1',
		config: {
			parameters: config.parameters ?? {},
		},
		...(subnodeType ? { _subnodeType: subnodeType } : {}),
	} as NodeInstance<string, string, unknown>;
}

function createGraphNode(node: NodeInstance<string, string, unknown>): GraphNode {
	return { instance: node, connections: new Map() };
}

function createContext(nodes: Array<NodeInstance<string, string, unknown>>): PluginContext {
	const map = new Map<string, GraphNode>();
	for (const node of nodes) {
		map.set(node.name, createGraphNode(node));
	}
	return {
		nodes: map,
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
	};
}

describe('memoryFromInputValidator', () => {
	it('has correct id', () => {
		expect(memoryFromInputValidator.id).toBe('core:memory-from-input');
	});

	it('flags fromInput memory when workflow has no Chat Trigger', () => {
		const telegram = createMockNode('n8n-nodes-base.telegramTrigger', 'Telegram Trigger');
		const memory = createMockNode(
			'@n8n/n8n-nodes-langchain.memoryBufferWindow',
			'Window Memory',
			{ parameters: { sessionIdType: 'fromInput' } },
			'ai_memory',
		);
		const issues = memoryFromInputValidator.validateNode(
			memory,
			createGraphNode(memory),
			createContext([telegram, memory]),
		);
		expect(issues).toEqual([
			expect.objectContaining({
				code: 'MEMORY_FROM_INPUT_WITHOUT_CHAT_TRIGGER',
				nodeName: 'Window Memory',
			}),
		]);
	});

	it('flags default (omitted) sessionIdType without Chat Trigger', () => {
		const webhook = createMockNode('n8n-nodes-base.webhook', 'Webhook');
		const memory = createMockNode(
			'@n8n/n8n-nodes-langchain.memoryBufferWindow',
			'Window Memory',
			{ parameters: {} },
			'ai_memory',
		);
		const issues = memoryFromInputValidator.validateNode(
			memory,
			createGraphNode(memory),
			createContext([webhook, memory]),
		);
		expect(issues.map((i) => i.code)).toEqual(['MEMORY_FROM_INPUT_WITHOUT_CHAT_TRIGGER']);
	});

	it('does not flag when Chat Trigger is present', () => {
		const chat = createMockNode(
			'@n8n/n8n-nodes-langchain.chatTrigger',
			'When chat message received',
		);
		const memory = createMockNode(
			'@n8n/n8n-nodes-langchain.memoryBufferWindow',
			'Window Memory',
			{ parameters: { sessionIdType: 'fromInput' } },
			'ai_memory',
		);
		expect(
			memoryFromInputValidator.validateNode(
				memory,
				createGraphNode(memory),
				createContext([chat, memory]),
			),
		).toEqual([]);
	});

	it('does not flag customKey memory', () => {
		const telegram = createMockNode('n8n-nodes-base.telegramTrigger', 'Telegram Trigger');
		const memory = createMockNode(
			'@n8n/n8n-nodes-langchain.memoryBufferWindow',
			'Window Memory',
			{
				parameters: {
					sessionIdType: 'customKey',
					sessionKey: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
				},
			},
			'ai_memory',
		);
		expect(
			memoryFromInputValidator.validateNode(
				memory,
				createGraphNode(memory),
				createContext([telegram, memory]),
			),
		).toEqual([]);
	});
});
