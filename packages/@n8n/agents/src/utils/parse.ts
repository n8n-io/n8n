import type AjvType from 'ajv';
import type { ValidateFunction } from 'ajv';
import type { JSONSchema7 } from 'json-schema';
import type { ZodType } from 'zod';

import { isZodSchema } from './zod';

export type ParseResult<T = unknown> =
	| { success: true; data: T }
	| { success: false; error: string };

/**
 * Ajv bakes draft support into the bundle rather than into its meta-schema
 * registry, so the two dialects are not interchangeable: the draft-07 bundle
 * silently ignores `prefixItems` / `unevaluatedProperties` / `minContains`, and
 * the 2020-12 bundle hard-throws on a draft-07 tuple (`items: [...]`).
 */
type Dialect = '2020-12' | 'draft-07';

/** Dialects whose tuple/keyword semantics the legacy Ajv bundle models. */
const LEGACY_DIALECT = /draft-0[4-7]|draft\/2019-09/;

const ajvInstances = new Map<string, InstanceType<typeof AjvType>>();

function getAjv(dialect: Dialect, unicodeRegExp: boolean): InstanceType<typeof AjvType> {
	const key = `${dialect}:${unicodeRegExp}`;
	const cached = ajvInstances.get(key);
	if (cached) return cached;

	/* eslint-disable @typescript-eslint/no-require-imports */
	const { default: Ajv } = (dialect === '2020-12' ? require('ajv/dist/2020') : require('ajv')) as {
		default: typeof AjvType;
	};
	const { default: addFormats } = require('ajv-formats') as {
		default: (ajv: InstanceType<typeof AjvType>) => void;
	};
	/* eslint-enable @typescript-eslint/no-require-imports */

	const instance = new Ajv({
		strict: false,
		allErrors: true,
		// `validateSchema` lints the schema *document* against its meta-schema
		// before compiling — it has nothing to do with validating data. Leaving it
		// on makes any schema declaring a dialect we did not register throw
		// `no schema with key or ref ...` before its data is ever looked at. The
		// keyword compilers still reject a malformed schema, just with different
		// wording.
		validateSchema: false,
		...(unicodeRegExp ? {} : { unicodeRegExp: false }),
	});
	addFormats(instance);
	ajvInstances.set(key, instance);
	return instance;
}

/** Bundle preference for a schema: the dialect it declares, else 2020-12 —
 *  MCP's default for embedded schemas when `$schema` is absent (SEP-1613). */
function preferredDialects(schema: JSONSchema7): [Dialect, Dialect] {
	return schema.$schema && LEGACY_DIALECT.test(schema.$schema)
		? ['draft-07', '2020-12']
		: ['2020-12', 'draft-07'];
}

type CompileResult =
	| { success: true; ajv: InstanceType<typeof AjvType>; validate: ValidateFunction }
	| { success: false; errors: string[] };

function compileJsonSchema(schema: JSONSchema7): CompileResult {
	const [preferred, fallback] = preferredDialects(schema);
	// `unicodeRegExp: false` is the retry for a pattern Node's `u` flag rejects;
	// the other dialect is the retry for keyword semantics the bundle cannot model.
	const attempts: Array<[Dialect, boolean]> = [
		[preferred, true],
		[preferred, false],
		[fallback, true],
		[fallback, false],
	];

	// Each bundle rejects the schema for its own reason and no one of them is the
	// authoritative complaint, so keep them all. The set collapses the pairs that
	// differ only by `unicodeRegExp`.
	const errors = new Set<string>();
	for (const [dialect, unicodeRegExp] of attempts) {
		const ajv = getAjv(dialect, unicodeRegExp);
		try {
			return { success: true, ajv, validate: ajv.compile(schema) };
		} catch (error) {
			errors.add(error instanceof Error ? error.message : String(error));
		}
	}
	return { success: false, errors: [...errors] };
}

/**
 * Validate `data` against a Zod schema or a raw JSON Schema.
 * Returns a unified success/failure result, with parsed data on success.
 *
 * Note the two branches differ in what they return on success: Zod strips
 * unknown keys, applies defaults and runs transforms, so `data` comes back
 * reshaped; Ajv only inspects, so `data` comes back byref and unchanged. A
 * JSON Schema is therefore a contract check, never a filter.
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

	const compiled = compileJsonSchema(schema);
	if (!compiled.success) {
		// Name the schema as the defect. Reporting success here would run a handler
		// on input nothing ever checked.
		return { success: false, error: `Schema could not be compiled: ${compiled.errors.join('; ')}` };
	}

	const { ajv, validate } = compiled;
	if (validate(data)) return { success: true, data };
	return { success: false, error: ajv.errorsText(validate.errors) };
}
