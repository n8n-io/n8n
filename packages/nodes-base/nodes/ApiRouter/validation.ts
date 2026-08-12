import type { ValidateFunction } from 'ajv';
import { jsonParse } from 'n8n-workflow';

export type ValidationIssue = {
	path: string;
	message: string;
};

export type ValidationOutcome = { valid: true } | { valid: false; errors: ValidationIssue[] };

const validators = new Map<string, ValidateFunction>();

async function compile(schemaJson: string): Promise<ValidateFunction> {
	const cached = validators.get(schemaJson);
	if (cached !== undefined) return cached;

	// ajv pulls in a code generator and a full format library; only endpoints that
	// declare a schema should pay for loading it.
	// both packages set `module.exports = <value>` alongside `exports.default`, so
	// under node16 resolution the constructor/plugin sits one level deeper.
	const { Ajv } = await import('ajv');
	const { default: addFormats } = (await import('ajv-formats')).default;

	const ajv = new Ajv({ allErrors: true, strict: false, coerceTypes: false });
	addFormats(ajv);

	const validator = ajv.compile(jsonParse<object>(schemaJson));
	validators.set(schemaJson, validator);
	return validator;
}

/**
 * Validates a request body against a JSON Schema. A schema that is absent, blank
 * or unparseable validates everything — a broken schema must not take an endpoint
 * offline.
 */
export async function validateRequestBody(
	schemaJson: string | undefined,
	body: unknown,
): Promise<ValidationOutcome> {
	if (schemaJson === undefined || schemaJson.trim().length === 0) return { valid: true };

	let validator: ValidateFunction;
	try {
		validator = await compile(schemaJson);
	} catch {
		return { valid: true };
	}

	if (validator(body)) return { valid: true };

	return {
		valid: false,
		errors: (validator.errors ?? []).map((error) => ({
			path: error.instancePath === '' ? '/' : error.instancePath,
			message: error.message ?? 'is invalid',
		})),
	};
}

/** Exported for tests; the cache is keyed by schema text and otherwise never cleared. */
export function clearValidatorCache(): void {
	validators.clear();
}
