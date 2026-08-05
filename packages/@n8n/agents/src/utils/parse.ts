import type AjvType from 'ajv';
import type { ValidateFunction } from 'ajv';
import type { JSONSchema7 } from 'json-schema';
import type { ZodType } from 'zod';

import { isZodSchema } from './zod';

export type ParseResult<T = unknown> =
	| { success: true; data: T }
	| { success: false; error: string; schemaInvalid?: true };

type Dialect = '2020-12' | '2019-09' | 'draft-07';

const DIALECT_MARKERS: Array<[RegExp, Dialect]> = [
	[/draft\/2020-12/, '2020-12'],
	[/draft\/2019-09/, '2019-09'],
	[/draft-0[4-7]/, 'draft-07'],
];

const ajvInstances = new Map<string, InstanceType<typeof AjvType>>();

function loadAjv(dialect: Dialect): typeof AjvType {
	/* eslint-disable @typescript-eslint/no-require-imports */
	const bundle =
		dialect === '2020-12'
			? require('ajv/dist/2020')
			: dialect === '2019-09'
				? require('ajv/dist/2019')
				: require('ajv');
	/* eslint-enable @typescript-eslint/no-require-imports */
	return (bundle as { default: typeof AjvType }).default;
}

function getAjv(dialect: Dialect, unicodeRegExp: boolean): InstanceType<typeof AjvType> {
	const key = `${dialect}:${unicodeRegExp}`;
	const cached = ajvInstances.get(key);
	if (cached) return cached;

	const Ajv = loadAjv(dialect);
	const instance = new Ajv({
		strict: false,
		allErrors: true,
		// Ajv otherwise checks its version against the `$schema`
		validateSchema: false,
		...(unicodeRegExp ? {} : { unicodeRegExp: false }),
	});
	ajvInstances.set(key, instance);
	return instance;
}

/** Ajv bundles to try, in order: starts at 2020-12, MCP's default for JSON schemas */
function candidateDialects(schema: JSONSchema7): Dialect[] {
	const declaredMarker = schema.$schema;
	const declared = declaredMarker
		? DIALECT_MARKERS.find(([marker]) => marker.test(declaredMarker))?.[1]
		: undefined;
	const rest = (['2020-12', '2019-09', 'draft-07'] as const).filter((d) => d !== declared);
	return declared ? [declared, ...rest] : rest;
}

type CompileResult =
	| { success: true; ajv: InstanceType<typeof AjvType>; validate: ValidateFunction }
	| { success: false; error: string };

interface CompileAttempt {
	dialect: Dialect;
	unicodeRegExp: boolean;
}

const resolvedAttempts = new WeakMap<JSONSchema7, CompileAttempt>();

function compileJsonSchema(schema: JSONSchema7): CompileResult {
	const attempts: CompileAttempt[] = candidateDialects(schema).flatMap((dialect) => [
		{ dialect, unicodeRegExp: true },
		{ dialect, unicodeRegExp: false },
	]);
	const resolved = resolvedAttempts.get(schema);
	if (resolved) attempts.unshift(resolved);

	let lastError: unknown;
	for (const attempt of attempts) {
		const ajv = getAjv(attempt.dialect, attempt.unicodeRegExp);
		try {
			const validate = ajv.compile(schema);
			resolvedAttempts.set(schema, attempt);
			return { success: true, ajv, validate };
		} catch (error) {
			lastError = error;
		}
	}
	return {
		success: false,
		error: lastError instanceof Error ? lastError.message : String(lastError),
	};
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

	const compiled = compileJsonSchema(schema);
	if (!compiled.success) {
		return {
			success: false,
			error: `Schema could not be compiled: ${compiled.error}`,
			schemaInvalid: true,
		};
	}

	const { ajv, validate } = compiled;
	if (validate(data)) return { success: true, data };
	return { success: false, error: ajv.errorsText(validate.errors) };
}
