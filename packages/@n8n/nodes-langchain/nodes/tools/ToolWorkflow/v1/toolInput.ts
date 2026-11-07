import type { JSONSchema7 } from 'json-schema';
import type { IDataObject } from 'n8n-workflow';

const acceptsUnlistedKeys = (schema: JSONSchema7) =>
	(schema.additionalProperties !== undefined && schema.additionalProperties !== false) ||
	Object.keys(schema.patternProperties ?? {}).length > 0 ||
	(schema.type === 'object' && !schema.properties);

export function toToolInput(schema: JSONSchema7 | undefined, json: IDataObject): IDataObject {
	if (!schema) return json;

	const input = { ...json };
	delete input.toolCallId;

	const parts = [
		schema,
		...(schema.allOf ?? []),
		...(schema.anyOf ?? []),
		...(schema.oneOf ?? []),
	].filter((part): part is JSONSchema7 => typeof part === 'object');
	if (!schema.properties || parts.some(acceptsUnlistedKeys)) return input;

	const keys = new Set(parts.flatMap((part) => Object.keys(part.properties ?? {})));
	return Object.fromEntries(Object.entries(input).filter(([key]) => keys.has(key)));
}
