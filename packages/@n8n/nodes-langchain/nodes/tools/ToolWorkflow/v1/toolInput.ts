import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import type { IDataObject } from 'n8n-workflow';

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

export function toToolInput(schema: JSONSchema7 | undefined, json: IDataObject): IDataObject {
	if (!schema) return json;

	const input = { ...json };
	delete input.toolCallId;

	const parts = flatten(schema);
	const limited = parts.some(limitsExtraKeys);
	if (!limited && (!schema.properties || parts.some(keepsExtraKeys))) return input;

	const keys = new Set(parts.flatMap((part) => Object.keys(part.properties ?? {})));
	const toolInput = Object.fromEntries(Object.entries(input).filter(([key]) => keys.has(key)));
	if (!limited) return toolInput;

	const zodSchema = convertJsonSchemaToZod(schema);
	for (const [key, value] of Object.entries(input)) {
		if (!keys.has(key) && zodSchema.safeParse({ ...toolInput, [key]: value }).success) {
			toolInput[key] = value;
		}
	}
	return toolInput;
}
