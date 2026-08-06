import type AjvType from 'ajv';
import type { ValidateFunction } from 'ajv';
import type { JSONSchema7 } from 'json-schema';
import type { ZodType } from 'zod';

import { isZodSchema } from './zod';

export type ParseResult<T = unknown> =
	| { success: true; data: T }
	| { success: false; error: string };

export interface ParseOptions {
	/** For schemas converted from Zod, whose `.strip()` `zodToJsonSchema` renders as the stricter `additionalProperties: false`. */
	stripUnknown?: boolean;
}

const ajvInstances = new Map<string, InstanceType<typeof AjvType>>();

function getAjv(unicodeRegExp = true, stripUnknown = false): InstanceType<typeof AjvType> {
	const key = `${String(unicodeRegExp)}:${String(stripUnknown)}`;
	const cached = ajvInstances.get(key);
	if (cached) return cached;

	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { default: Ajv } = require('ajv') as { default: typeof AjvType };
	const instance = new Ajv({
		strict: false,
		...(unicodeRegExp ? {} : { unicodeRegExp: false }),
		...(stripUnknown ? { removeAdditional: true } : {}),
	});
	ajvInstances.set(key, instance);
	return instance;
}

/**
 * Validate `data` against a Zod schema or a raw JSON Schema.
 * Returns a unified success/failure result, with parsed data on success.
 */
export async function parseWithSchema(
	schema: ZodType | JSONSchema7,
	data: unknown,
	options: ParseOptions = {},
): Promise<ParseResult> {
	if (isZodSchema(schema)) {
		const result = await schema.safeParseAsync(data);
		if (result.success) return { success: true, data: result.data };
		return { success: false, error: result.error.message };
	}

	const { stripUnknown = false } = options;
	// Ajv strips in place, so clone to leave the caller's object intact as Zod does.
	const target = stripUnknown ? structuredClone(data) : data;

	let ajv = getAjv(true, stripUnknown);
	let validate: ValidateFunction;
	try {
		validate = ajv.compile(schema);
	} catch (error) {
		if (!(error instanceof SyntaxError)) throw error;
		ajv = getAjv(false, stripUnknown);
		validate = ajv.compile(schema);
	}
	if (validate(target)) return { success: true, data: target };
	return { success: false, error: ajv.errorsText(validate.errors) };
}
