import type AjvType from 'ajv';
import type { ValidateFunction } from 'ajv';
import type { JSONSchema7 } from 'json-schema';
import type { ZodType } from 'zod';

import { isZodSchema } from './zod';

export type ParseResult<T = unknown> =
	| { success: true; data: T }
	| { success: false; error: string };

let ajvInstance: InstanceType<typeof AjvType> | undefined;
let nonUnicodeAjvInstance: InstanceType<typeof AjvType> | undefined;

function getAjv(unicodeRegExp = true): InstanceType<typeof AjvType> {
	const instance = unicodeRegExp ? ajvInstance : nonUnicodeAjvInstance;
	if (instance) return instance;

	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { default: Ajv } = require('ajv') as { default: typeof AjvType };
	const newInstance = new Ajv({
		strict: false,
		...(unicodeRegExp ? {} : { unicodeRegExp: false }),
	});
	if (unicodeRegExp) ajvInstance = newInstance;
	else nonUnicodeAjvInstance = newInstance;
	return newInstance;
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

	let ajv = getAjv();
	let validate: ValidateFunction;
	try {
		validate = ajv.compile(schema);
	} catch (error) {
		if (!(error instanceof SyntaxError)) throw error;
		ajv = getAjv(false);
		validate = ajv.compile(schema);
	}
	if (validate(data)) return { success: true, data };
	return { success: false, error: ajv.errorsText(validate.errors) };
}
