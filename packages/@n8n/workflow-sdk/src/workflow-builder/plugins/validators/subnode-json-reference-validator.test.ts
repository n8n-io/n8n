import { subnodeJsonReferenceValidator } from './subnode-json-reference-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	type: string,
	name: string,
	parameters: Record<string, unknown> = {},
	subnodeType?: string,
): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: '1',
		config: { parameters },
		...(subnodeType ? { _subnodeType: subnodeType } : {}),
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

function validate(node: NodeInstance<string, string, unknown>) {
	return subnodeJsonReferenceValidator.validateNode(node, createGraphNode(node), createContext());
}

describe('subnodeJsonReferenceValidator', () => {
	it('has correct id', () => {
		expect(subnodeJsonReferenceValidator.id).toBe('core:subnode-json-reference');
	});

	it('flags $json in a tool subnode parameter', () => {
		const node = createMockNode(
			'n8n-nodes-base.gmailTool',
			'send_email',
			{ sendTo: '={{ $json.email }}' },
			'ai_tool',
		);

		const issues = validate(node);
		expect(issues.map((i) => i.code)).toEqual(['SUBNODE_UNSAFE_JSON_REFERENCE']);
		expect(issues[0].parameterPath).toBe('sendTo');
		expect(issues[0].message).toContain('fromAi');
	});

	it('flags $json in nested subnode parameters', () => {
		const node = createMockNode(
			'n8n-nodes-base.googleSheetsTool',
			'update_row',
			{ columns: { value: { 'PO Number': '={{ $json.poNumber }}' } } },
			'ai_tool',
		);

		const issues = validate(node);
		expect(issues.map((i) => i.code)).toEqual(['SUBNODE_UNSAFE_JSON_REFERENCE']);
		expect(issues[0].parameterPath).toBe('columns.value.PO Number');
	});

	it('ignores document loaders, where $json is the parent input item', () => {
		const node = createMockNode(
			'@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
			'Default Data Loader',
			{ jsonMode: 'expressionData', jsonData: '={{ $json.text }}' },
			'ai_document',
		);

		expect(validate(node)).toEqual([]);
	});

	it('does not duplicate the memory session key rule', () => {
		const node = createMockNode(
			'@n8n/n8n-nodes-langchain.memoryBufferWindow',
			'Memory',
			{ sessionIdType: 'customKey', sessionKey: '={{ $json.chatId }}' },
			'ai_memory',
		);

		expect(validate(node)).toEqual([]);
	});

	it('flags $json in other memory parameters', () => {
		const node = createMockNode(
			'@n8n/n8n-nodes-langchain.memoryPostgresChat',
			'Memory',
			{ sessionIdType: 'customKey', sessionKey: 'chat', tableName: '={{ $json.table }}' },
			'ai_memory',
		);

		expect(validate(node).map((i) => i.parameterPath)).toEqual(['tableName']);
	});

	it('accepts explicit node references', () => {
		const node = createMockNode(
			'n8n-nodes-base.gmailTool',
			'send_email',
			{ sendTo: "={{ $('Chat Trigger').item.json.email }}" },
			'ai_tool',
		);

		expect(validate(node)).toEqual([]);
	});

	it('ignores main-flow nodes', () => {
		const node = createMockNode('n8n-nodes-base.set', 'Shape', { value: '={{ $json.email }}' });

		expect(validate(node)).toEqual([]);
	});
});
