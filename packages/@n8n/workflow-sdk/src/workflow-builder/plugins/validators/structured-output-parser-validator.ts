/**
 * Structured Output Parser Validator
 *
 * Flags LangChain nodes whose `fromJson` schema config cannot work at runtime:
 * - object-stored `jsonSchemaExample`: the node passes the value to
 *   `JSON.parse` without stringifying, so it becomes `"[object Object]"`;
 * - JSON Schema content in `jsonSchemaExample`: that field expects example
 *   values; JSON Schema belongs in `schemaType: "manual"` + `inputSchema`.
 *
 * Applies to Structured Output Parser, Information Extractor, Code Tool, and
 * Call n8n Workflow Tool (v1 schema mode).
 */

import { isRecord } from '@n8n/utils/is-record';

import type { NodeInstance } from '../../../types/base';
import { parseVersion } from '../../string-utils';
import type { ValidationIssue, ValidatorPlugin } from '../types';

/** Structured Output Parser gained `schemaType` in 1.2; earlier versions use `jsonSchema`. */
const MIN_SCHEMA_TYPE_VERSION = 1.2;

const NODE_LABELS = new Map<string, string>([
	['@n8n/n8n-nodes-langchain.outputParserStructured', 'Structured Output Parser'],
	['@n8n/n8n-nodes-langchain.informationExtractor', 'Information Extractor'],
	['@n8n/n8n-nodes-langchain.toolCode', 'Code Tool'],
	['@n8n/n8n-nodes-langchain.toolWorkflow', 'Call n8n Workflow Tool'],
]);

function usesFromJsonExample(
	nodeType: string,
	params: Record<string, unknown>,
	typeVersion: number,
): boolean {
	switch (nodeType) {
		case '@n8n/n8n-nodes-langchain.outputParserStructured':
			return typeVersion >= MIN_SCHEMA_TYPE_VERSION && params.schemaType !== 'manual';
		case '@n8n/n8n-nodes-langchain.informationExtractor':
			return params.schemaType === 'fromJson';
		case '@n8n/n8n-nodes-langchain.toolCode':
		case '@n8n/n8n-nodes-langchain.toolWorkflow':
			return params.specifyInputSchema === true && params.schemaType !== 'manual';
		default:
			return false;
	}
}

function looksLikeJsonSchema(value: unknown): boolean {
	if (!isRecord(value) || value.type !== 'object') return false;
	const properties = value.properties;
	if (!isRecord(properties)) return false;

	// In JSON Schema every entry of `properties` is a subschema (object or boolean), whatever
	// keywords it uses ($ref, enum, anyOf, description only). Example objects hold plain values.
	const subschemas = Object.values(properties);
	return (
		subschemas.length > 0 && subschemas.every((prop) => isRecord(prop) || typeof prop === 'boolean')
	);
}

function resolveExampleValue(raw: unknown): { value?: unknown; parseError?: string } {
	if (typeof raw === 'string') {
		if (raw.startsWith('=')) return {};
		try {
			const value: unknown = JSON.parse(raw);
			return { value };
		} catch (error) {
			return { parseError: error instanceof Error ? error.message : 'parse error' };
		}
	}
	if (typeof raw === 'object' && raw !== null) return { value: raw };
	return {};
}

export const structuredOutputParserValidator: ValidatorPlugin = {
	id: 'core:structured-output-parser',
	name: 'Structured Output Parser Validator',
	nodeTypes: [...NODE_LABELS.keys()],
	priority: 45,

	validateNode(node: NodeInstance<string, string, unknown>): ValidationIssue[] {
		const label = NODE_LABELS.get(node.type);
		if (!label) return [];

		const params = node.config?.parameters;
		if (!isRecord(params)) return [];
		if (!usesFromJsonExample(node.type, params, parseVersion(node.version))) return [];

		const rawExample = params.jsonSchemaExample;
		if (rawExample === undefined || rawExample === null) return [];

		const report = (code: string, message: string): ValidationIssue => ({
			code,
			message,
			severity: 'warning',
			nodeName: node.name,
			parameterPath: 'jsonSchemaExample',
		});

		const issues: ValidationIssue[] = [];

		if (typeof rawExample !== 'string') {
			issues.push(
				report(
					'STRUCTURED_OUTPUT_PARSER_EXAMPLE_NOT_STRING',
					`${label} uses schemaType "fromJson", but jsonSchemaExample is stored as an object. ` +
						'At runtime the node passes it to JSON.parse without stringifying, which throws \'"[object Object]" is not valid JSON\'. ' +
						'Set jsonSchemaExample to a JSON string with example values, e.g. \'{ "summary": "", "items": [] }\'.',
				),
			);
		}

		const { value, parseError } = resolveExampleValue(rawExample);
		if (parseError) {
			issues.push(
				report(
					'STRUCTURED_OUTPUT_PARSER_EXAMPLE_INVALID',
					`${label} jsonSchemaExample is not valid JSON (${parseError}). ` +
						'At runtime the node throws before the agent can run. ' +
						'Provide a JSON string with example output values.',
				),
			);
			return issues;
		}

		if (value !== undefined && looksLikeJsonSchema(value)) {
			issues.push(
				report(
					'STRUCTURED_OUTPUT_PARSER_SCHEMA_IN_EXAMPLE_FIELD',
					`${label} uses schemaType "fromJson", but jsonSchemaExample contains a JSON Schema definition ` +
						'(type/properties). That mode expects example output values, not a schema. ' +
						'Either switch to schemaType "manual" with inputSchema, or replace jsonSchemaExample with a sample object ' +
						'like \'{ "summary": "", "highPriority": [] }\'.',
				),
			);
		}

		return issues;
	},
};
