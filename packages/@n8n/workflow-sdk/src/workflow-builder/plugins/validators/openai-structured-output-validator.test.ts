import { openAiStructuredOutputValidator } from './openai-structured-output-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	type: string,
	name: string,
	parameters: Record<string, unknown>,
): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: '2.3',
		config: { parameters },
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

function jsonSchemaParams(schema: unknown, textOptionsShape: 'object' | 'array' = 'object') {
	const textOptions = { type: 'json_schema', name: 'my_schema', schema };
	return {
		resource: 'text',
		operation: 'response',
		options: {
			textFormat: {
				textOptions: textOptionsShape === 'object' ? textOptions : [textOptions],
			},
		},
	};
}

const VALID_SCHEMA = JSON.stringify({
	type: 'object',
	properties: { items: { type: 'array', items: { type: 'string' } } },
	required: ['items'],
	additionalProperties: false,
});

describe('openAiStructuredOutputValidator', () => {
	const codes = (parameters: Record<string, unknown>) => {
		const node = createMockNode('@n8n/n8n-nodes-langchain.openAi', 'Extract', parameters);
		return openAiStructuredOutputValidator
			.validateNode(node, createGraphNode(node), createContext())
			.map((i) => i.code);
	};

	it('has correct id', () => {
		expect(openAiStructuredOutputValidator.id).toBe('core:openai-structured-output');
	});

	it('flags a schema string that is not valid JSON', () => {
		const node = createMockNode(
			'@n8n/n8n-nodes-langchain.openAi',
			'Extract Action Items',
			jsonSchemaParams('{ "type": "object", '),
		);
		const issues = openAiStructuredOutputValidator.validateNode(
			node,
			createGraphNode(node),
			createContext(),
		);
		expect(issues).toHaveLength(1);
		expect(issues[0].code).toBe('OPENAI_STRUCTURED_OUTPUT_SCHEMA_INVALID');
		expect(issues[0].message).toContain('Failed to parse schema');
	});

	it('accepts a valid object schema', () => {
		expect(codes(jsonSchemaParams(VALID_SCHEMA))).toEqual([]);
	});

	it('flags array-stored textOptions', () => {
		expect(codes(jsonSchemaParams(VALID_SCHEMA, 'array'))).toEqual([
			'OPENAI_STRUCTURED_OUTPUT_IGNORED',
		]);
	});

	it('flags an object-valued schema', () => {
		expect(codes(jsonSchemaParams({ type: 'object' }))).toEqual([
			'OPENAI_STRUCTURED_OUTPUT_SCHEMA_INVALID',
		]);
	});

	it('ignores expressions and non-json_schema formats', () => {
		expect(codes(jsonSchemaParams('={{ $json.schema }}'))).toEqual([]);
		expect(codes({ textFormat: { textOptions: { type: 'text' } } })).toEqual([]);
	});
});
