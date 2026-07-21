import type { JSONSchema7 } from 'json-schema';
import type { ZodType } from 'zod';

import { fixSchema } from './json-schema';
import { isZodSchema, zodToJsonSchema } from './zod';

export function assertToolInputSchemaIsObject(
	toolName: string,
	inputSchema: ZodType | JSONSchema7,
): void {
	const jsonSchema = isZodSchema(inputSchema) ? zodToJsonSchema(inputSchema) : inputSchema;
	const normalizedSchema = jsonSchema ? fixSchema(jsonSchema) : null;

	if (normalizedSchema?.type === 'object') return;

	throw new Error(
		`Tool "${toolName}" input schema must serialize to a top-level JSON object with type: "object". Root z.union() and z.discriminatedUnion() schemas serialize as anyOf; use z.object() with a discriminator and superRefine() for conditional fields.`,
	);
}
