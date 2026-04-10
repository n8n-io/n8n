import type AjvType from 'ajv';
import type { JSONSchema7 } from 'json-schema';
import type { ZodType } from 'zod';

import { isZodSchema } from './zod';

export type ParseResult<T = unknown> =
	| { success: true; data: T }
	| { success: false; error: string };

let ajvInstance: InstanceType<typeof AjvType> | undefined;

function getAjv(): InstanceType<typeof AjvType> {
	if (!ajvInstance) {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { default: Ajv } = require('ajv') as { default: typeof AjvType };
		ajvInstance = new Ajv({ strict: false });
	}
	return ajvInstance;
}

/**
 * Validate `data` against a Zod schema or a raw JSON Schema.
 * Returns a unified success/failure result, with parsed data on success.
 */
export async function parseWithSchema(
	schema: ZodType | JSONSchema7,
	data: unknown,
): Promise<ParseResult> {
	if (isZodSchema(schema)) {
		const result = await schema.safeParseAsync(data);
		if (result.success) return { success: true, data: result.data };
		return { success: false, error: result.error.message };
	}

	const ajv = getAjv();
	const validate = ajv.compile(schema);
	if (validate(data)) return { success: true, data };
	return { success: false, error: ajv.errorsText(validate.errors) };
}
