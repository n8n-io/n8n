import type AjvType from 'ajv';
import type { ValidateFunction } from 'ajv';
import type { JSONSchema7 } from 'json-schema';
import type { ZodType } from 'zod';

import { isZodSchema } from './zod';

export type ParseResult<T = unknown> =
	| { success: true; data: T }
	| { success: false; error: string; schemaInvalid?: true };

export interface ParseOptions {
	/** For schemas converted from Zod, whose `.strip()` `zodToJsonSchema` renders as the stricter `additionalProperties: false`. */
	stripUnknown?: boolean;
}

type Dialect = '2020-12' | '2019-09' | 'draft-07';

const DIALECT_MARKERS: Array<[RegExp, Dialect]> = [
	[/draft\/2020-12/, '2020-12'],
	[/draft\/2019-09/, '2019-09'],
	[/draft-0[4-7]/, 'draft-07'],
];

const ajvConstructors = new Map<Dialect, Promise<typeof AjvType>>();

async function loadAjv(dialect: Dialect): Promise<typeof AjvType> {
	const cached = ajvConstructors.get(dialect);
	if (cached) return await cached;

	const loading = (async () => {
		const bundle =
			dialect === '2020-12'
				? await import('ajv/dist/2020.js')
				: dialect === '2019-09'
					? await import('ajv/dist/2019.js')
					: await import('ajv');
		return bundle.default.default;
	})();
	loading.catch(() => ajvConstructors.delete(dialect));
	ajvConstructors.set(dialect, loading);
	return await loading;
}

/** Only the declared dialect is tried: falling back to another one would turn a clear
 *  compile error into silently weaker validation. Undeclared schemas start at 2020-12,
 *  MCP's default dialect. */
function candidateDialects(schema: JSONSchema7): Dialect[] {
	const declaredMarker = schema.$schema;
	const declared = declaredMarker
		? DIALECT_MARKERS.find(([marker]) => marker.test(declaredMarker))?.[1]
		: undefined;
	return declared ? [declared] : ['2020-12', '2019-09', 'draft-07'];
}

type CompileResult =
	| { success: true; ajv: InstanceType<typeof AjvType>; validate: ValidateFunction }
	| { success: false; error: string };

async function compileJsonSchema(
	schema: JSONSchema7,
	stripUnknown: boolean,
): Promise<CompileResult> {
	let firstError: unknown;
	for (const dialect of candidateDialects(schema)) {
		let Ajv: typeof AjvType;
		try {
			Ajv = await loadAjv(dialect);
		} catch (error) {
			firstError ??= error;
			continue;
		}
		for (const unicodeRegExp of [true, false]) {
			try {
				// Ajv retains every schema it compiles for the life of the instance, so this
				// one is scoped to a single validation and collected along with it.
				const ajv = new Ajv({
					strict: false,
					allErrors: true,
					// Ajv otherwise checks its version against the `$schema`
					validateSchema: false,
					unicodeRegExp,
					removeAdditional: stripUnknown,
				});
				return { success: true, ajv, validate: ajv.compile(schema) };
			} catch (error) {
				firstError ??= error;
			}
		}
	}
	return {
		success: false,
		error: firstError instanceof Error ? firstError.message : String(firstError),
	};
}

function schemaCompileError(error: string): ParseResult {
	return { success: false, error: `Schema could not be compiled: ${error}`, schemaInvalid: true };
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

	// Strict first: Ajv's `removeAdditional` drops properties while trying a failing
	// `anyOf`/`oneOf` branch, so a payload that already matches a branch must never reach it.
	const strict = await compileJsonSchema(schema, false);
	if (!strict.success) return schemaCompileError(strict.error);
	if (strict.validate(data)) return { success: true, data };
	if (!options.stripUnknown) {
		return { success: false, error: strict.ajv.errorsText(strict.validate.errors) };
	}

	const stripping = await compileJsonSchema(schema, true);
	if (!stripping.success) return schemaCompileError(stripping.error);
	// Ajv strips in place, so clone to leave the caller's object intact as Zod does.
	const target = structuredClone(data);
	if (stripping.validate(target)) return { success: true, data: target };
	return { success: false, error: stripping.ajv.errorsText(stripping.validate.errors) };
}
