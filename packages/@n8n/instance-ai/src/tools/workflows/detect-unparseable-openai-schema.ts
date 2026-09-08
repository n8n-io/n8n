import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { ValidationWarning } from './workflow-validation-warnings';

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
 * Flags OpenAI nodes whose structured-output ("JSON Schema") config cannot work
 * at runtime:
 * - array-stored `textOptions`: the node reads the path as an object, so the
 *   whole format block is silently ignored and plain text comes back;
 * - non-string schema values and unparseable JSON: the node passes the raw
 *   value through `jsonParse` per item and throws "Failed to parse schema";
 * - non-object schema roots: the OpenAI API rejects them for structured output.
 * All three are defects the builder never sees at build time otherwise.
 */
export function detectUnparseableOpenAiSchema(json: WorkflowJSON): ValidationWarning[] {
	const warnings: ValidationWarning[] = [];

	for (const node of json.nodes ?? []) {
		if (node.type !== OPENAI_NODE_TYPE) continue;
		const params = node.parameters;
		if (!isRecord(params)) continue;
		const resolved = getTextOptions(params);
		if (!resolved || resolved.options.type !== 'json_schema') continue;
		const nodeName = typeof node.name === 'string' ? node.name : undefined;

		if (resolved.storedAsArray) {
			warnings.push({
				code: 'OPENAI_STRUCTURED_OUTPUT_IGNORED',
				nodeName,
				message:
					'OpenAI node stores textFormat.textOptions as an ARRAY. At runtime the node reads that path as an object, ' +
					'so the JSON Schema output format is silently ignored and the node returns plain text. ' +
					'Store textOptions as a single object: textFormat: { textOptions: { type: "json_schema", name, schema } }.',
			});
			continue;
		}

		const schema = resolved.options.schema;
		if (schema === undefined || schema === null) continue;
		// n8n treats a value as an expression only when its FIRST character is '='.
		if (typeof schema === 'string' && schema.startsWith('=')) continue;
		if (typeof schema === 'string' && schema.trim().length === 0) continue;

		if (typeof schema !== 'string') {
			warnings.push({
				code: 'OPENAI_STRUCTURED_OUTPUT_SCHEMA_INVALID',
				nodeName,
				message:
					'OpenAI node output format is "JSON Schema", but the schema value is not a string. ' +
					'The node passes the raw value through JSON.parse and throws "Failed to parse schema" at runtime. ' +
					'Serialize the schema to a JSON string in textFormat.textOptions.schema.',
			});
			continue;
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(schema);
		} catch (error) {
			warnings.push({
				code: 'OPENAI_STRUCTURED_OUTPUT_SCHEMA_INVALID',
				nodeName,
				message:
					'OpenAI node output format is "JSON Schema", but the schema string is not valid JSON ' +
					`(${error instanceof Error ? error.message : 'parse error'}). ` +
					'At runtime the node throws "Failed to parse schema" before making any request. ' +
					'Set textFormat.textOptions.schema to valid JSON.',
			});
			continue;
		}

		if (!isRecord(parsed) || parsed.type !== 'object') {
			warnings.push({
				code: 'OPENAI_STRUCTURED_OUTPUT_SCHEMA_INVALID',
				nodeName,
				message:
					'OpenAI node output format is "JSON Schema", but the schema root is not an object schema ' +
					`(got ${JSON.stringify(isRecord(parsed) ? parsed.type : parsed)}). ` +
					'The OpenAI API rejects non-object roots for structured output. ' +
					'Use a root of the form {"type": "object", "properties": {...}}.',
			});
		}
	}

	return warnings;
}
