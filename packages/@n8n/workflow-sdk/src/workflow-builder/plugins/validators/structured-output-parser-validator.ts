/**
 * Structured Output Parser Validator
 *
 * Flags OutputParserStructured nodes whose `fromJson` config cannot work at
 * runtime:
 * - object-stored `jsonSchemaExample`: the node passes the value to
 *   `JSON.parse` without stringifying, so it becomes `"[object Object]"`;
 * - JSON Schema content in `jsonSchemaExample`: that field expects example
 *   values; use `schemaType: "manual"` + `inputSchema` for JSON Schema.
 */

import { isRecord } from '@n8n/utils/is-record';

import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const OUTPUT_PARSER_TYPE = '@n8n/n8n-nodes-langchain.outputParserStructured';

function isFromJsonMode(params: Record<string, unknown>, typeVersion: number): boolean {
	if (typeVersion <= 1.1) return false;
	return params.schemaType !== 'manual';
}

function looksLikeJsonSchema(value: unknown): boolean {
	if (!isRecord(value) || value.type !== 'object') return false;
	const properties = value.properties;
	if (!isRecord(properties) || Object.keys(properties).length === 0) return false;

	return Object.values(properties).some((prop) => isRecord(prop) && typeof prop.type === 'string');
}

function resolveExampleValue(raw: unknown): { value?: unknown; parseError?: string } {
	if (raw === undefined || raw === null) return {};
	if (typeof raw === 'string') {
		if (raw.startsWith('=')) return {};
		const trimmed = raw.trim();
		if (trimmed.length === 0) return {};
		try {
			return { value: JSON.parse(trimmed) as unknown };
		} catch (error) {
			return {
				parseError: error instanceof Error ? error.message : 'parse error',
			};
		}
	}
	if (typeof raw === 'object') {
		return { value: raw };
	}
	return {};
}

export const structuredOutputParserValidator: ValidatorPlugin = {
	id: 'core:structured-output-parser',
	name: 'Structured Output Parser Validator',
	nodeTypes: [OUTPUT_PARSER_TYPE],
	priority: 45,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const params = node.config?.parameters;
		if (!isRecord(params)) return [];

		const typeVersion = Number(node.version);
		if (!isFromJsonMode(params, typeVersion)) return [];

		const rawExample = params.jsonSchemaExample;
		if (rawExample === undefined || rawExample === null) return [];

		const issues: ValidationIssue[] = [];

		if (typeof rawExample !== 'string') {
			issues.push({
				code: 'STRUCTURED_OUTPUT_PARSER_EXAMPLE_NOT_STRING',
				message:
					'Structured Output Parser uses schemaType "fromJson", but jsonSchemaExample is stored as an object. ' +
					'At runtime the node passes it to JSON.parse without stringifying, which throws \'"[object Object]" is not valid JSON\'. ' +
					'Set jsonSchemaExample to a JSON string with example values, e.g. \'{ "summary": "", "items": [] }\'.',
				severity: 'warning',
				nodeName: node.name,
				parameterPath: 'jsonSchemaExample',
			});
		}

		const { value, parseError } = resolveExampleValue(rawExample);
		if (parseError) {
			issues.push({
				code: 'STRUCTURED_OUTPUT_PARSER_EXAMPLE_INVALID',
				message:
					'Structured Output Parser jsonSchemaExample is not valid JSON ' +
					`(${parseError}). At runtime the node throws before the agent can run. ` +
					'Provide a JSON string with example output values.',
				severity: 'warning',
				nodeName: node.name,
				parameterPath: 'jsonSchemaExample',
			});
			return issues;
		}

		if (value !== undefined && looksLikeJsonSchema(value)) {
			issues.push({
				code: 'STRUCTURED_OUTPUT_PARSER_SCHEMA_IN_EXAMPLE_FIELD',
				message:
					'Structured Output Parser uses schemaType "fromJson", but jsonSchemaExample contains a JSON Schema definition ' +
					'(type/properties). That mode expects example output values, not a schema. ' +
					'Either switch to schemaType "manual" with inputSchema, or replace jsonSchemaExample with a sample object ' +
					'like \'{ "summary": "", "highPriority": [] }\'.',
				severity: 'warning',
				nodeName: node.name,
				parameterPath: 'jsonSchemaExample',
			});
		}

		return issues;
	},
};
