import { aiGatewayValidator } from './ai-gateway-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	parameters: Record<string, unknown>,
	credentials?: Record<string, unknown>,
	version = '1',
): NodeInstance<string, string, unknown> {
	return {
		type: '@n8n/n8n-nodes-langchain.openAi',
		name: 'OpenAI',
		version,
		config: { parameters, credentials },
	} as NodeInstance<string, string, unknown>;
}

function ctx(aiGatewayByNodeType?: PluginContext['validationOptions']): PluginContext {
	return {
		nodes: new Map(),
		workflowId: 't',
		workflowName: 'T',
		settings: {},
		validationOptions: aiGatewayByNodeType,
	};
}

describe('aiGatewayValidator', () => {
	it('no-ops without metadata', () => {
		const node = createMockNode(
			{ operation: 'message' },
			{ openAiApi: { __newCredential: true, name: 'X' } },
		);
		expect(
			aiGatewayValidator.validateNode(
				node,
				{ instance: node, connections: new Map() } as GraphNode,
				ctx(),
			),
		).toEqual([]);
	});

	it('flags typeVersion below minVersion when using unmanaged-looking newCredential', () => {
		const node = createMockNode(
			{ resource: 'text', operation: 'message' },
			{ openAiApi: { __newCredential: true, name: 'Credits' } },
			'1',
		);
		const issues = aiGatewayValidator.validateNode(
			node,
			{ instance: node, connections: new Map() } as GraphNode,
			ctx({
				aiGatewayByNodeType: {
					'@n8n/n8n-nodes-langchain.openAi': {
						supported: true,
						minVersion: 3,
						operations: { text: ['response'] },
					},
				},
			}),
		);
		expect(issues.map((i) => i.code)).toContain('AI_GATEWAY_CONSTRAINT');
		expect(issues.some((i) => i.message.includes('minimum 3'))).toBe(true);
	});

	it('flags unsupported operation', () => {
		const node = createMockNode(
			{ resource: 'text', operation: 'message' },
			{ openAiApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true } },
			'3',
		);
		const issues = aiGatewayValidator.validateNode(
			node,
			{ instance: node, connections: new Map() } as GraphNode,
			ctx({
				aiGatewayByNodeType: {
					'@n8n/n8n-nodes-langchain.openAi': {
						supported: true,
						minVersion: 3,
						operations: { text: ['response'] },
					},
				},
			}),
		);
		expect(issues.some((i) => i.message.includes('message'))).toBe(true);
	});
});
