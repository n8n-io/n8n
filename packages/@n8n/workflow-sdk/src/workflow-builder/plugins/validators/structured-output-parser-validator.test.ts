import { structuredOutputParserValidator } from './structured-output-parser-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	parameters: Record<string, unknown>,
	version = '1.3',
): NodeInstance<string, string, unknown> {
	return {
		type: '@n8n/n8n-nodes-langchain.outputParserStructured',
		name: 'Structured Output Parser',
		version,
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

function codes(parameters: Record<string, unknown>, version = '1.3'): string[] {
	const node = createMockNode(parameters, version);
	return structuredOutputParserValidator
		.validateNode(node, createGraphNode(node), createContext())
		.map((issue) => issue.code);
}

const VALID_EXAMPLE =
	'{ "summary": "", "highPriority": [], "mediumPriority": [], "lowPriority": [] }';

const SCHEMA_OBJECT = {
	type: 'object',
	properties: {
		summary: { type: 'string', description: 'Overview' },
		highPriority: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					subject: { type: 'string' },
					actionItem: { type: 'string' },
				},
			},
		},
	},
	required: ['summary', 'highPriority'],
};

describe('structuredOutputParserValidator', () => {
	it('has correct id', () => {
		expect(structuredOutputParserValidator.id).toBe('core:structured-output-parser');
	});

	it('accepts a valid fromJson example string', () => {
		expect(codes({ schemaType: 'fromJson', jsonSchemaExample: VALID_EXAMPLE })).toEqual([]);
	});

	it('accepts default fromJson mode when schemaType is omitted', () => {
		expect(codes({ jsonSchemaExample: VALID_EXAMPLE })).toEqual([]);
	});

	it('ignores manual schema mode', () => {
		expect(
			codes({
				schemaType: 'manual',
				inputSchema: JSON.stringify(SCHEMA_OBJECT),
				jsonSchemaExample: SCHEMA_OBJECT,
			}),
		).toEqual([]);
	});

	it('ignores legacy v1.1 jsonSchema field', () => {
		expect(
			codes({ jsonSchema: JSON.stringify(SCHEMA_OBJECT), jsonSchemaExample: SCHEMA_OBJECT }, '1.1'),
		).toEqual([]);
	});

	it('flags object-stored jsonSchemaExample', () => {
		expect(codes({ schemaType: 'fromJson', jsonSchemaExample: SCHEMA_OBJECT })).toContain(
			'STRUCTURED_OUTPUT_PARSER_EXAMPLE_NOT_STRING',
		);
	});

	it('flags JSON Schema content in fromJson mode (string form)', () => {
		expect(
			codes({ schemaType: 'fromJson', jsonSchemaExample: JSON.stringify(SCHEMA_OBJECT) }),
		).toContain('STRUCTURED_OUTPUT_PARSER_SCHEMA_IN_EXAMPLE_FIELD');
	});

	it('flags JSON Schema content in fromJson mode (object form)', () => {
		const result = codes({ schemaType: 'fromJson', jsonSchemaExample: SCHEMA_OBJECT });
		expect(result).toContain('STRUCTURED_OUTPUT_PARSER_EXAMPLE_NOT_STRING');
		expect(result).toContain('STRUCTURED_OUTPUT_PARSER_SCHEMA_IN_EXAMPLE_FIELD');
	});

	it('flags invalid JSON strings', () => {
		expect(codes({ schemaType: 'fromJson', jsonSchemaExample: '{ "summary": ' })).toEqual([
			'STRUCTURED_OUTPUT_PARSER_EXAMPLE_INVALID',
		]);
	});

	it('ignores expression-valued jsonSchemaExample', () => {
		expect(codes({ schemaType: 'fromJson', jsonSchemaExample: '={{ $json.schema }}' })).toEqual([]);
	});

	it('does not treat plain example objects with nested data as JSON Schema', () => {
		const example = JSON.stringify({
			summary: 'Inbox overview',
			highPriority: [{ subject: 'Renew contract', from: 'jane@example.com', actionItem: 'Sign' }],
			mediumPriority: [],
			lowPriority: [],
		});
		expect(codes({ schemaType: 'fromJson', jsonSchemaExample: example })).toEqual([]);
	});
});
