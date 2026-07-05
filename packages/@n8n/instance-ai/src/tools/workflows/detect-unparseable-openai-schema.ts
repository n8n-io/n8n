import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { ValidationWarning } from './workflow-validation-warnings';

const OPENAI_NODE_TYPE = '@n8n/n8n-nodes-langchain.openAi';

/** fixedCollection storage: `textOptions` is an object, or an array of one. */
function getTextOptions(parameters: Record<string, unknown>): Record<string, unknown> | undefined {
	const textFormat = parameters.textFormat;
	if (!isRecord(textFormat)) return undefined;
	const raw = textFormat.textOptions;
	if (isRecord(raw)) return raw;
	if (Array.isArray(raw) && isRecord(raw[0])) return raw[0];
	return undefined;
}

/** Why the schema string won't survive the node's runtime parse, or undefined when fine. */
function schemaProblem(schema: string): string | undefined {
	let parsed: unknown;
	try {
		parsed = JSON.parse(schema);
	} catch (error) {
		return `is not valid JSON (${error instanceof Error ? error.message : 'parse error'})`;
	}
	if (!isRecord(parsed)) return 'must be a JSON object, not a bare value or array';
	if (parsed.type !== 'object') {
		return `must declare "type": "object" at the root (got ${JSON.stringify(parsed.type)})`;
	}
	return undefined;
}

/**
 * Flags OpenAI nodes whose structured-output schema string cannot be parsed.
 * The node calls `jsonParse(textOptions.schema)` at execute time and throws
 * "Failed to parse schema" before making any request, so a bad schema written
 * at build time is a guaranteed runtime crash the builder never sees.
 */
export function detectUnparseableOpenAiSchema(json: WorkflowJSON): ValidationWarning[] {
	const warnings: ValidationWarning[] = [];

	for (const node of json.nodes ?? []) {
		if (node.type !== OPENAI_NODE_TYPE) continue;
		const params = node.parameters;
		if (!isRecord(params)) continue;
		const textOptions = getTextOptions(params);
		if (!textOptions || textOptions.type !== 'json_schema') continue;

		const schema = textOptions.schema;
		if (typeof schema !== 'string' || schema.trim().length === 0) continue;
		// Expressions resolve at runtime — not statically checkable.
		if (schema.trimStart().startsWith('=')) continue;

		const problem = schemaProblem(schema);
		if (!problem) continue;

		warnings.push({
			code: 'OPENAI_STRUCTURED_OUTPUT_SCHEMA_INVALID',
			nodeName: typeof node.name === 'string' ? node.name : undefined,
			message:
				`OpenAI node output format is "JSON Schema", but the schema string ${problem}. ` +
				'At runtime the node throws "Failed to parse schema" before making any request. ' +
				'Set textFormat.textOptions.schema to a valid JSON Schema object with "type": "object" at the root.',
		});
	}

	return warnings;
}
