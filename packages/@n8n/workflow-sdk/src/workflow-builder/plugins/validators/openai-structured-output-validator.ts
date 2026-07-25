/**
 * OpenAI Structured Output Validator
 *
 * Flags OpenAI nodes whose structured-output ("JSON Schema") config cannot work
 * at runtime:
 * - array-stored `textOptions`: the node reads the path as an object, so the
 *   whole format block is silently ignored and plain text comes back;
 * - non-string schema values and unparseable JSON: the node passes the raw
 *   value through `jsonParse` per item and throws "Failed to parse schema";
 * - non-object schema roots: the OpenAI API rejects them for structured output.
 */

import { isRecord } from '@n8n/utils/is-record';

import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const OPENAI_NODE_TYPE = '@n8n/n8n-nodes-langchain.openAi';

interface ResolvedTextOptions {
	options: Record<string, unknown>;
	/** fixedCollection can persist the values as an array of one entry. */
	storedAsArray: boolean;
}

function getTextOptions(parameters: Record<string, unknown>): ResolvedTextOptions | undefined {
	// The Response operation nests its format config under the `options`
	// collection (`parameters.options.textFormat` — this is where built
	// workflows carry it); the top level is checked too as a defensive
	// fallback for future param layouts.
	const optionsParam = isRecord(parameters.options) ? parameters.options : undefined;
	const textFormat = optionsParam?.textFormat ?? parameters.textFormat;
	if (!isRecord(textFormat)) return undefined;
	const raw = textFormat.textOptions;
	if (isRecord(raw)) return { options: raw, storedAsArray: false };
	if (Array.isArray(raw) && isRecord(raw[0])) return { options: raw[0], storedAsArray: true };
	return undefined;
}

/**
 * Validator for OpenAI structured-output schema configuration.
 */
export const openAiStructuredOutputValidator: ValidatorPlugin = {
	id: 'core:openai-structured-output',
	name: 'OpenAI Structured Output Validator',
	nodeTypes: [OPENAI_NODE_TYPE],
	priority: 45,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const params = node.config?.parameters;
		if (!isRecord(params)) return [];
		const resolved = getTextOptions(params);
		if (!resolved || resolved.options.type !== 'json_schema') return [];

		const issues: ValidationIssue[] = [];

		if (resolved.storedAsArray) {
			issues.push({
				code: 'OPENAI_STRUCTURED_OUTPUT_IGNORED',
				message:
					'OpenAI node stores textFormat.textOptions as an ARRAY. At runtime the node reads that path as an object, ' +
					'so the JSON Schema output format is silently ignored and the node returns plain text. ' +
					'Store textOptions as a single object: textFormat: { textOptions: { type: "json_schema", name, schema } }.',
				severity: 'warning',
				nodeName: node.name,
				parameterPath: 'textFormat.textOptions',
			});
			return issues;
		}

		const schema = resolved.options.schema;
		if (schema === undefined || schema === null) return issues;
		// n8n treats a value as an expression only when its FIRST character is '='.
		if (typeof schema === 'string' && schema.startsWith('=')) return issues;
		if (typeof schema === 'string' && schema.trim().length === 0) return issues;

		if (typeof schema !== 'string') {
			issues.push({
				code: 'OPENAI_STRUCTURED_OUTPUT_SCHEMA_INVALID',
				message:
					'OpenAI node output format is "JSON Schema", but the schema value is not a string. ' +
					'The node passes the raw value through JSON.parse and throws "Failed to parse schema" at runtime. ' +
					'Serialize the schema to a JSON string in textFormat.textOptions.schema.',
				severity: 'warning',
				nodeName: node.name,
				parameterPath: 'textFormat.textOptions.schema',
			});
			return issues;
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(schema);
		} catch (error) {
			issues.push({
				code: 'OPENAI_STRUCTURED_OUTPUT_SCHEMA_INVALID',
				message:
					'OpenAI node output format is "JSON Schema", but the schema string is not valid JSON ' +
					`(${error instanceof Error ? error.message : 'parse error'}). ` +
					'At runtime the node throws "Failed to parse schema" before making any request. ' +
					'Set textFormat.textOptions.schema to valid JSON.',
				severity: 'warning',
				nodeName: node.name,
				parameterPath: 'textFormat.textOptions.schema',
			});
			return issues;
		}

		if (!isRecord(parsed) || parsed.type !== 'object') {
			issues.push({
				code: 'OPENAI_STRUCTURED_OUTPUT_SCHEMA_INVALID',
				message:
					'OpenAI node output format is "JSON Schema", but the schema root is not an object schema ' +
					`(got ${JSON.stringify(isRecord(parsed) ? parsed.type : parsed)}). ` +
					'The OpenAI API rejects non-object roots for structured output. ' +
					'Use a root of the form {"type": "object", "properties": {...}}.',
				severity: 'warning',
				nodeName: node.name,
				parameterPath: 'textFormat.textOptions.schema',
			});
		}

		return issues;
	},
};
