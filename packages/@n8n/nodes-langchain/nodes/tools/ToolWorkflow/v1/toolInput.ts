import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import { safeRegex, type IDataObject } from 'n8n-workflow';
import type { ZodTypeAny } from 'zod';

import { convertJsonSchemaToZod } from '../../../../utils/schemaParsing';

const flatten = (schema: JSONSchema7Definition): JSONSchema7[] =>
	typeof schema === 'object'
		? [
				schema,
				...[...(schema.allOf ?? []), ...(schema.anyOf ?? []), ...(schema.oneOf ?? [])].flatMap(
					flatten,
				),
			]
		: [];

const acceptsAnyValue = (schema: JSONSchema7Definition | undefined) =>
	schema === true || (typeof schema === 'object' && Object.keys(schema).length === 0);

const limitsExtraKeys = (part: JSONSchema7) =>
	(part.additionalProperties !== undefined && !acceptsAnyValue(part.additionalProperties)) ||
	Object.keys(part.patternProperties ?? {}).length > 0;

const keepsExtraKeys = (part: JSONSchema7) =>
	acceptsAnyValue(part.additionalProperties) || (part.type === 'object' && !part.properties);

const zodSchemas = new WeakMap<JSONSchema7, ZodTypeAny>();

const fits = (schema: JSONSchema7Definition, value: unknown) => {
	if (typeof schema === 'boolean') return schema;
	const zodSchema = zodSchemas.get(schema) ?? convertJsonSchemaToZod(schema);
	zodSchemas.set(schema, zodSchema);
	return zodSchema.safeParse(value).success;
};

const allowsExtraKey = (part: JSONSchema7, key: string, value: unknown) => {
	const patterns = Object.entries(part.patternProperties ?? {}).filter(([pattern]) =>
		safeRegex.test(pattern, key),
	);
	if (patterns.length) return patterns.every(([, schema]) => fits(schema, value));
	if (part.additionalProperties === undefined) {
		return Object.values(part.patternProperties ?? {}).some((schema) => fits(schema, value));
	}
	return fits(part.additionalProperties, value);
};

export function toToolInput(schema: JSONSchema7 | undefined, json: IDataObject): IDataObject {
	if (!schema) return json;

	const input = { ...json };
	delete input.toolCallId;

	const parts = flatten(schema);
	const limits = parts.filter(limitsExtraKeys);
	if (!limits.length && (!schema.properties || parts.some(keepsExtraKeys))) return input;

	const keys = new Set(parts.flatMap((part) => Object.keys(part.properties ?? {})));
	return Object.fromEntries(
		Object.entries(input).filter(
			([key, value]) =>
				keys.has(key) ||
				(limits.length > 0 && limits.every((part) => allowsExtraKey(part, key, value))),
		),
	);
}
