import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue } from '../types';
import { structuredOutputParserValidator } from './structured-output-parser-validator';

const OUTPUT_PARSER = '@n8n/n8n-nodes-langchain.outputParserStructured';
const INFORMATION_EXTRACTOR = '@n8n/n8n-nodes-langchain.informationExtractor';
const CODE_TOOL = '@n8n/n8n-nodes-langchain.toolCode';
const WORKFLOW_TOOL = '@n8n/n8n-nodes-langchain.toolWorkflow';

function validate(
	parameters: Record<string, unknown>,
	version = '1.3',
	type = OUTPUT_PARSER,
): ValidationIssue[] {
	const node = {
		type,
		name: 'Structured Output Parser',
		version,
		config: { parameters },
	} as NodeInstance<string, string, unknown>;
	const graphNode: GraphNode = { instance: node, connections: new Map() };
	const ctx: PluginContext = {
		nodes: new Map([[node.name, graphNode]]),
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
	};

	return structuredOutputParserValidator.validateNode(node, graphNode, ctx);
}

function codes(
	parameters: Record<string, unknown>,
	version = '1.3',
	type = OUTPUT_PARSER,
): string[] {
	return validate(parameters, version, type).map((issue) => issue.code);
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
	it('targets the fromJson schema nodes at priority 45', () => {
		expect(structuredOutputParserValidator).toEqual(
			expect.objectContaining({
				id: 'core:structured-output-parser',
				name: 'Structured Output Parser Validator',
				nodeTypes: [OUTPUT_PARSER, INFORMATION_EXTRACTOR, CODE_TOOL, WORKFLOW_TOOL],
				priority: 45,
			}),
		);
	});

	it('reports warnings on the jsonSchemaExample parameter', () => {
		expect(validate({ schemaType: 'fromJson', jsonSchemaExample: '{ "summary": ' })).toEqual([
			expect.objectContaining({
				code: 'STRUCTURED_OUTPUT_PARSER_EXAMPLE_INVALID',
				severity: 'warning',
				nodeName: 'Structured Output Parser',
				parameterPath: 'jsonSchemaExample',
			}),
		]);
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

	it('checks v1.2, the first version with schemaType', () => {
		expect(codes({ schemaType: 'fromJson', jsonSchemaExample: SCHEMA_OBJECT }, '1.2')).toContain(
			'STRUCTURED_OUTPUT_PARSER_EXAMPLE_NOT_STRING',
		);
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

	describe('Information Extractor', () => {
		it('ignores fromAttributes mode', () => {
			expect(
				codes(
					{ schemaType: 'fromAttributes', jsonSchemaExample: SCHEMA_OBJECT },
					'1.2',
					INFORMATION_EXTRACTOR,
				),
			).toEqual([]);
		});

		it('flags invalid fromJson example', () => {
			expect(
				codes(
					{ schemaType: 'fromJson', jsonSchemaExample: SCHEMA_OBJECT },
					'1.2',
					INFORMATION_EXTRACTOR,
				),
			).toContain('STRUCTURED_OUTPUT_PARSER_EXAMPLE_NOT_STRING');
		});
	});

	describe('Code Tool', () => {
		it('ignores when specifyInputSchema is false', () => {
			expect(
				codes(
					{ specifyInputSchema: false, schemaType: 'fromJson', jsonSchemaExample: SCHEMA_OBJECT },
					'1.3',
					CODE_TOOL,
				),
			).toEqual([]);
		});

		it('flags invalid example when schema mode is enabled', () => {
			expect(
				codes(
					{ specifyInputSchema: true, schemaType: 'fromJson', jsonSchemaExample: SCHEMA_OBJECT },
					'1.3',
					CODE_TOOL,
				),
			).toContain('STRUCTURED_OUTPUT_PARSER_EXAMPLE_NOT_STRING');
		});
	});

	describe('Call n8n Workflow Tool', () => {
		it('ignores when specifyInputSchema is false', () => {
			expect(
				codes(
					{ specifyInputSchema: false, schemaType: 'fromJson', jsonSchemaExample: SCHEMA_OBJECT },
					'1.1',
					WORKFLOW_TOOL,
				),
			).toEqual([]);
		});

		it('flags JSON Schema content in fromJson mode', () => {
			expect(
				codes(
					{
						specifyInputSchema: true,
						schemaType: 'fromJson',
						jsonSchemaExample: JSON.stringify(SCHEMA_OBJECT),
					},
					'1.1',
					WORKFLOW_TOOL,
				),
			).toContain('STRUCTURED_OUTPUT_PARSER_SCHEMA_IN_EXAMPLE_FIELD');
		});
	});
});
