import { structuredOutputParserValidator } from './structured-output-parser-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import { workflow } from '../../../workflow-builder';
import { node, trigger } from '../../node-builders/node-builder';
import { outputParser } from '../../node-builders/subnode-builders';
import type { PluginContext, ValidationIssue } from '../types';

const OUTPUT_PARSER = '@n8n/n8n-nodes-langchain.outputParserStructured';
const INFORMATION_EXTRACTOR = '@n8n/n8n-nodes-langchain.informationExtractor';
const CODE_TOOL = '@n8n/n8n-nodes-langchain.toolCode';
const WORKFLOW_TOOL = '@n8n/n8n-nodes-langchain.toolWorkflow';
const CHAIN_LLM = '@n8n/n8n-nodes-langchain.chainLlm';
const AGENT = '@n8n/n8n-nodes-langchain.agent';

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

	it.each([
		['empty', ''],
		['whitespace-only', '   '],
	])('flags a %s jsonSchemaExample as invalid JSON', (_label, example) => {
		expect(codes({ schemaType: 'fromJson', jsonSchemaExample: example })).toEqual([
			'STRUCTURED_OUTPUT_PARSER_EXAMPLE_INVALID',
		]);
	});

	it('ignores expression-valued jsonSchemaExample', () => {
		expect(codes({ schemaType: 'fromJson', jsonSchemaExample: '={{ $json.schema }}' })).toEqual([]);
	});

	it('flags JSON Schema whose properties use keywords other than type', () => {
		const schema = JSON.stringify({
			type: 'object',
			properties: {
				status: { enum: ['open', 'closed'] },
				owner: { $ref: '#/definitions/user' },
				notes: { description: 'Free text' },
			},
		});
		expect(codes({ schemaType: 'fromJson', jsonSchemaExample: schema })).toEqual([
			'STRUCTURED_OUTPUT_PARSER_SCHEMA_IN_EXAMPLE_FIELD',
		]);
	});

	it('does not treat an example with a literal type field and plain properties as JSON Schema', () => {
		const example = JSON.stringify({ type: 'object', properties: { color: 'red', size: 3 } });
		expect(codes({ schemaType: 'fromJson', jsonSchemaExample: example })).toEqual([]);
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

	describe('production payloads through workflow().validate()', () => {
		// Two example values copied from production builds that passed validation and then
		// failed at run time: a JSON Schema pasted as the example (the model echoed the schema
		// back and every field came out null) and an object-valued example (the node threw
		// '"[object Object]" is not valid JSON').
		const SCHEMA_PASTED_AS_EXAMPLE =
			'{\n  "type": "object",\n  "properties": {\n    "name": { "type": "string" },\n    "ats_score": { "type": "number" },\n    "feedback": { "type": "string" },\n    "selected": { "type": "boolean" }\n  },\n  "required": ["name", "ats_score", "feedback", "selected"]\n}';
		const OBJECT_VALUED_EXAMPLE = {
			customer_name: '',
			delivery_address: '',
			is_order_complete: false,
			phone_number: '',
			products_ordered: '',
			reply_text: 'สวัสดีค่ะ ยินดีต้อนรับ มีอะไรให้ช่วยคะ',
			total_amount: '',
		};
		const CORRECTED_EXAMPLE =
			'{\n  "name": "Jane Doe",\n  "ats_score": 78,\n  "feedback": "Add measurable achievements.",\n  "selected": true\n}';

		function parserCodes(rootType: string, rootVersion: number, jsonSchemaExample: unknown) {
			const parser = outputParser({
				type: OUTPUT_PARSER,
				version: 1.3,
				config: { name: 'Structured Output Parser', parameters: { jsonSchemaExample } },
			});
			const root = node({
				type: rootType,
				version: rootVersion,
				config: {
					name: 'Root',
					parameters: { hasOutputParser: true },
					subnodes: { outputParser: parser },
				},
			});
			const start = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start' },
			});
			const result = workflow('wf', 'Parser check').add(start).to(root).validate();
			return [...result.errors, ...result.warnings]
				.map((issue) => issue.code)
				.filter((code) => code.startsWith('STRUCTURED_OUTPUT_PARSER'));
		}

		it('flags a JSON Schema pasted into the example of a Basic LLM Chain parser', () => {
			expect(parserCodes(CHAIN_LLM, 1.7, SCHEMA_PASTED_AS_EXAMPLE)).toEqual([
				'STRUCTURED_OUTPUT_PARSER_SCHEMA_IN_EXAMPLE_FIELD',
			]);
		});

		it('flags an object-valued example on an AI Agent parser', () => {
			expect(parserCodes(AGENT, 3.1, OBJECT_VALUED_EXAMPLE)).toEqual([
				'STRUCTURED_OUTPUT_PARSER_EXAMPLE_NOT_STRING',
			]);
		});

		it('accepts the corrected example values', () => {
			expect(parserCodes(CHAIN_LLM, 1.7, CORRECTED_EXAMPLE)).toEqual([]);
		});
	});
});
