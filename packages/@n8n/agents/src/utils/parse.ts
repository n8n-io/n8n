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

interface CompiledSchema {
	ajv: InstanceType<typeof AjvType>;
	validate: ValidateFunction;
}

type CompileResult = ({ success: true } & CompiledSchema) | { success: false; error: string };

// Keyed by schema object, so a compiled validator lives exactly as long as its schema.
const compiledStripping = new WeakMap<JSONSchema7, CompiledSchema>();
const compiledPreserving = new WeakMap<JSONSchema7, CompiledSchema>();

async function compileJsonSchema(
	schema: JSONSchema7,
	stripUnknown: boolean,
): Promise<CompileResult> {
	const cache = stripUnknown ? compiledStripping : compiledPreserving;
	const cached = cache.get(schema);
	if (cached) return { success: true, ...cached };

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
				// One instance per schema: Ajv retains everything it compiles — the schema,
				// its patterns and the generated code — for the instance's lifetime, so a
				// shared instance would accumulate every schema ever seen. Pairing the
				// instance with its validator in the WeakMap lets both go when the schema does.
				const ajv = new Ajv({
					strict: false,
					allErrors: true,
					// Ajv otherwise checks its version against the `$schema`
					validateSchema: false,
					...(unicodeRegExp ? {} : { unicodeRegExp: false }),
					...(stripUnknown ? { removeAdditional: true } : {}),
				});
				const validate = ajv.compile(schema);
				cache.set(schema, { ajv, validate });
				return { success: true, ajv, validate };
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
	const compiled = await compileJsonSchema(schema, stripUnknown);
	if (!compiled.success) {
		return {
			success: false,
			error: `Schema could not be compiled: ${compiled.error}`,
			schemaInvalid: true,
		};
	}

	const { ajv, validate } = compiled;
	// Ajv strips in place, so clone to leave the caller's object intact as Zod does.
	const target = stripUnknown ? structuredClone(data) : data;
	if (validate(target)) return { success: true, data: target };
	return { success: false, error: ajv.errorsText(validate.errors) };
}
