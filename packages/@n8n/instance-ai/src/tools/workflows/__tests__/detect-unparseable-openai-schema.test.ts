import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { IDataObject } from 'n8n-workflow';

import { detectUnparseableOpenAiSchema } from '../detect-unparseable-openai-schema';

function workflow(
	parameters: Record<string, unknown>,
	type = '@n8n/n8n-nodes-langchain.openAi',
): WorkflowJSON {
	return {
		id: 'wf-test',
		name: 'Test',
		nodes: [
			{
				id: '1',
				name: 'Extract Action Items',
				type,
				typeVersion: 2.3,
				position: [0, 0],
				parameters: parameters as IDataObject,
			},
		],
		connections: {},
	};
}

/** Real built-workflow shape: the Response operation nests textFormat under `options`. */
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

describe('detectUnparseableOpenAiSchema', () => {
	const codes = (w: WorkflowJSON) => detectUnparseableOpenAiSchema(w).map((x) => x.code);

	it('flags a schema string that is not valid JSON', () => {
		const w = workflow(jsonSchemaParams('{ "type": "object", '));
		const warnings = detectUnparseableOpenAiSchema(w);
		expect(warnings).toHaveLength(1);
		expect(warnings[0].code).toBe('OPENAI_STRUCTURED_OUTPUT_SCHEMA_INVALID');
		expect(warnings[0].nodeName).toBe('Extract Action Items');
		expect(warnings[0].message).toContain('Failed to parse schema');
	});

	it('flags a schema whose root is not an object schema', () => {
		expect(codes(workflow(jsonSchemaParams(JSON.stringify({ type: 'array' }))))).toEqual([
			'OPENAI_STRUCTURED_OUTPUT_SCHEMA_INVALID',
		]);
		expect(codes(workflow(jsonSchemaParams(JSON.stringify(['not', 'an', 'object']))))).toEqual([
			'OPENAI_STRUCTURED_OUTPUT_SCHEMA_INVALID',
		]);
	});

	it('accepts a valid object schema', () => {
		expect(codes(workflow(jsonSchemaParams(VALID_SCHEMA)))).toEqual([]);
	});

	it('flags array-stored textOptions as silently-ignored structured output (regardless of schema)', () => {
		// The node reads textFormat.textOptions as an object; an array-stored
		// config never reaches the json_schema branch at runtime.
		expect(codes(workflow(jsonSchemaParams('{ broken', 'array')))).toEqual([
			'OPENAI_STRUCTURED_OUTPUT_IGNORED',
		]);
		expect(codes(workflow(jsonSchemaParams(VALID_SCHEMA, 'array')))).toEqual([
			'OPENAI_STRUCTURED_OUTPUT_IGNORED',
		]);
	});

	it('flags an object-valued schema (JSON.parse of a non-string throws at runtime)', () => {
		const warnings = detectUnparseableOpenAiSchema(workflow(jsonSchemaParams({ type: 'object' })));
		expect(warnings).toHaveLength(1);
		expect(warnings[0].code).toBe('OPENAI_STRUCTURED_OUTPUT_SCHEMA_INVALID');
		expect(warnings[0].message).toContain('not a string');
	});

	it('ignores non-json_schema output formats, expressions, and other node types', () => {
		const textFormat = { textOptions: { type: 'text' } };
		expect(codes(workflow({ textFormat }))).toEqual([]);
		expect(codes(workflow(jsonSchemaParams('={{ $json.schema }}')))).toEqual([]);
		expect(codes(workflow(jsonSchemaParams('{ broken'), 'n8n-nodes-base.httpRequest'))).toEqual([]);
		expect(codes(workflow({}))).toEqual([]);
	});

	it('treats a leading-space "=" as a literal string, not an expression (n8n semantics)', () => {
		// n8n only treats charAt(0)==='=' as an expression; ' ={{...}}' is a
		// literal that will crash JSON.parse at runtime.
		expect(codes(workflow(jsonSchemaParams(' ={{ $json.schema }}')))).toEqual([
			'OPENAI_STRUCTURED_OUTPUT_SCHEMA_INVALID',
		]);
	});

	it('ignores an empty or absent schema value', () => {
		expect(codes(workflow(jsonSchemaParams('   ')))).toEqual([]);
		expect(codes(workflow(jsonSchemaParams(undefined)))).toEqual([]);
	});

	it('also inspects a top-level textFormat (defensive fallback)', () => {
		const topLevel = {
			resource: 'text',
			operation: 'response',
			textFormat: { textOptions: { type: 'json_schema', name: 's', schema: '{ broken' } },
		};
		expect(codes(workflow(topLevel))).toEqual(['OPENAI_STRUCTURED_OUTPUT_SCHEMA_INVALID']);
	});

	it('ignores non-json_schema formats under options.textFormat too', () => {
		const textParams = {
			resource: 'text',
			operation: 'response',
			options: { textFormat: { textOptions: { type: 'text' } } },
		};
		expect(codes(workflow(textParams))).toEqual([]);
	});
});
