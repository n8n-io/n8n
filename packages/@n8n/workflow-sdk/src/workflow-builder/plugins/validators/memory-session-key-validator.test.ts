import { memorySessionKeyValidator } from './memory-session-key-validator';
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
	return {
		instance: node,
		connections: new Map(),
	};
}

function createMockPluginContext(): PluginContext {
	return {
		nodes: new Map(),
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
	};
}

describe('memorySessionKeyValidator', () => {
	describe('metadata', () => {
		it('has correct id', () => {
			expect(memorySessionKeyValidator.id).toBe('core:memory-session-key');
		});

		it('has correct name', () => {
			expect(memorySessionKeyValidator.name).toBe('Memory Session Key Validator');
		});
	});

	describe('validateNode', () => {
		it('returns warning for an AI memory subnode custom session key using $json', () => {
			const node = createMockNode(
				'@n8n/n8n-nodes-langchain.memoryBufferWindow',
				'Conversation Memory',
				{
					parameters: {
						sessionIdType: 'customKey',
						sessionKey: '={{ $json.chatId }}',
					},
				},
				'ai_memory',
			);
			const ctx = createMockPluginContext();

			const issues = memorySessionKeyValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'UNSAFE_MEMORY_SESSION_KEY_EXPRESSION',
					severity: 'error',
					violationLevel: 'major',
					nodeName: 'Conversation Memory',
					parameterPath: 'sessionKey',
				}),
			);
		});

		it('returns warning for legacy memory sessionId parameters using $json', () => {
			const node = createMockNode(
				'@n8n/n8n-nodes-langchain.memoryMotorhead',
				'Conversation Memory',
				{
					parameters: {
						sessionIdType: 'customKey',
						sessionId: '={{ $json.chatId }}',
					},
				},
				'ai_memory',
			);
			const ctx = createMockPluginContext();

			const issues = memorySessionKeyValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'UNSAFE_MEMORY_SESSION_KEY_EXPRESSION',
					parameterPath: 'sessionId',
				}),
			);
		});

		it('returns no warning for explicit node references', () => {
			const node = createMockNode(
				'@n8n/n8n-nodes-langchain.memoryBufferWindow',
				'Conversation Memory',
				{
					parameters: {
						sessionIdType: 'customKey',
						sessionKey: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
					},
				},
				'ai_memory',
			);
			const ctx = createMockPluginContext();

			const issues = memorySessionKeyValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no warning for Chat Trigger fromInput memory mode', () => {
			const node = createMockNode(
				'@n8n/n8n-nodes-langchain.memoryBufferWindow',
				'Conversation Memory',
				{
					parameters: {
						sessionIdType: 'fromInput',
						sessionKey: '={{ $json.sessionId }}',
					},
				},
				'ai_memory',
			);
			const ctx = createMockPluginContext();

			const issues = memorySessionKeyValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no warning for non-memory subnodes using $json', () => {
			const node = createMockNode(
				'@n8n/n8n-nodes-langchain.lmChatOpenAi',
				'OpenAI Chat Model',
				{
					parameters: {
						model: 'gpt-5.4',
						options: {
							baseURL: '={{ $json.baseUrl }}',
						},
					},
				},
				'ai_languageModel',
			);
			const ctx = createMockPluginContext();

			const issues = memorySessionKeyValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no warning for a regular agent text parameter using $json', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.agent', 'AI Agent', {
				parameters: {
					text: '={{ $json.chatInput }}',
				},
			});
			const ctx = createMockPluginContext();

			const issues = memorySessionKeyValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});
	});
});
