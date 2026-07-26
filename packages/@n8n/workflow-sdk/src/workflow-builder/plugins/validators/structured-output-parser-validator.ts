/**
 * Structured Output Parser Validator
 *
 * Flags LangChain nodes whose `fromJson` config cannot work at runtime:
 * - object-stored `jsonSchemaExample`: the node passes the value to
 *   `JSON.parse` without stringifying, so it becomes `"[object Object]"`;
 * - JSON Schema content in `jsonSchemaExample`: that field expects example
 *   values; use `schemaType: "manual"` + `inputSchema` for JSON Schema.
 *
 * Applies to OutputParserStructured, Information Extractor, Code Tool, and
 * Call n8n Workflow Tool (v1 schema mode).
 */

import { isRecord } from '@n8n/utils/is-record';

import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const JSON_SCHEMA_FROM_EXAMPLE_NODE_TYPES = [
	'@n8n/n8n-nodes-langchain.outputParserStructured',
	'@n8n/n8n-nodes-langchain.informationExtractor',
	'@n8n/n8n-nodes-langchain.toolCode',
	'@n8n/n8n-nodes-langchain.toolWorkflow',
] as const;

const NODE_LABELS: Record<(typeof JSON_SCHEMA_FROM_EXAMPLE_NODE_TYPES)[number], string> = {
	'@n8n/n8n-nodes-langchain.outputParserStructured': 'Structured Output Parser',
	'@n8n/n8n-nodes-langchain.informationExtractor': 'Information Extractor',
	'@n8n/n8n-nodes-langchain.toolCode': 'Code Tool',
	'@n8n/n8n-nodes-langchain.toolWorkflow': 'Call n8n Workflow Tool',
};

function usesFromJsonExample(
	nodeType: string,
	params: Record<string, unknown>,
	typeVersion: number,
): boolean {
	switch (nodeType) {
		case '@n8n/n8n-nodes-langchain.outputParserStructured':
			if (typeVersion <= 1.1) return false;
			return params.schemaType !== 'manual';
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
	nodeTypes: [...JSON_SCHEMA_FROM_EXAMPLE_NODE_TYPES],
	priority: 45,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const nodeType = node.type;
		if (
			!JSON_SCHEMA_FROM_EXAMPLE_NODE_TYPES.includes(
				nodeType as (typeof JSON_SCHEMA_FROM_EXAMPLE_NODE_TYPES)[number],
			)
		) {
			return [];
		}

		const params = node.config?.parameters;
		if (!isRecord(params)) return [];

		const typeVersion = Number(node.version);
		if (!usesFromJsonExample(nodeType, params, typeVersion)) return [];

		const rawExample = params.jsonSchemaExample;
		if (rawExample === undefined || rawExample === null) return [];

		const label = NODE_LABELS[nodeType as (typeof JSON_SCHEMA_FROM_EXAMPLE_NODE_TYPES)[number]];
		const issues: ValidationIssue[] = [];

		if (typeof rawExample !== 'string') {
			issues.push({
				code: 'STRUCTURED_OUTPUT_PARSER_EXAMPLE_NOT_STRING',
				message:
					`${label} uses schemaType "fromJson", but jsonSchemaExample is stored as an object. ` +
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
					`${label} jsonSchemaExample is not valid JSON ` +
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
					`${label} uses schemaType "fromJson", but jsonSchemaExample contains a JSON Schema definition ` +
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
