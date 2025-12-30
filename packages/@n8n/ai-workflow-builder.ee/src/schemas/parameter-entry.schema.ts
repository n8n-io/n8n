import { z } from 'zod';

/**
 * Supported parameter value types that LLMs can reliably produce.
 * Note: No 'json' type - all structures are flattened to dot notation paths.
 */
export const ParameterValueType = z.enum(['string', 'number', 'boolean']);
export type ParameterValueType = z.infer<typeof ParameterValueType>;

/**
 * Single parameter entry with dot notation path.
 *
 * Examples:
 * - Simple: { path: "method", type: "string", value: "POST" }
 * - Array item: { path: "headers.0.name", type: "string", value: "Content-Type" }
 * - Nested: { path: "options.retry.maxRetries", type: "number", value: "3" }
 * - Boolean: { path: "sendHeaders", type: "boolean", value: "true" }
 * - Expression: { path: "url", type: "string", value: "={{ $json.apiUrl }}" }
 */
export const ParameterEntrySchema = z.object({
	path: z
		.string()
		.min(1)
		.describe(
			'Dot notation path to the parameter. Use numeric indices for array items. Examples: "method", "headers.0.name", "options.retry.maxRetries"',
		),
	type: ParameterValueType.describe(
		'The type of value: string (text/expressions), number (numeric), boolean (true/false)',
	),
	value: z
		.string()
		.describe(
			'The parameter value as a string. Numbers should be numeric strings like "42". Booleans should be "true" or "false". Expressions use n8n syntax like "={{ $json.field }}"',
		),
});

export type ParameterEntry = z.infer<typeof ParameterEntrySchema>;
