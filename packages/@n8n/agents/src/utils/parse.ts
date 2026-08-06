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

const ajvInstances = new Map<string, Promise<InstanceType<typeof AjvType>>>();

async function loadAjv(dialect: Dialect): Promise<typeof AjvType> {
	const bundle =
		dialect === '2020-12'
			? await import('ajv/dist/2020.js')
			: dialect === '2019-09'
				? await import('ajv/dist/2019.js')
				: await import('ajv');
	return bundle.default.default;
}

async function getAjv(
	dialect: Dialect,
	unicodeRegExp: boolean,
	stripUnknown: boolean,
): Promise<InstanceType<typeof AjvType>> {
	const key = `${dialect}:${unicodeRegExp}:${stripUnknown}`;
	const cached = ajvInstances.get(key);
	if (cached) return await cached;

	const instance = loadAjv(dialect).then(
		(Ajv) =>
			new Ajv({
				strict: false,
				allErrors: true,
				// Ajv otherwise checks its version against the `$schema`
				validateSchema: false,
				// Ajv otherwise registers each schema under its `$id`, so the next
				// deserialized copy collides with the one already registered
				addUsedSchema: false,
				...(unicodeRegExp ? {} : { unicodeRegExp: false }),
				...(stripUnknown ? { removeAdditional: true } : {}),
			}),
	);
	instance.catch(() => ajvInstances.delete(key));
	ajvInstances.set(key, instance);
	return await instance;
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
		for (const unicodeRegExp of [true, false]) {
			let ajv: InstanceType<typeof AjvType> | undefined;
			try {
				ajv = await getAjv(dialect, unicodeRegExp, stripUnknown);
				const validate = ajv.compile(schema);
				cache.set(schema, { ajv, validate });
				return { success: true, ajv, validate };
			} catch (error) {
				firstError ??= error;
			} finally {
				// Ajv keeps every schema it is handed in a strong Map, so an instance that
				// outlives the schemas compiled on it would retain all of them forever.
				ajv?.removeSchema(schema);
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
