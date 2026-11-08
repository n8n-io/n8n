import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import pick from 'lodash/pick';
import type { IDataObject } from 'n8n-workflow';

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

	const { toolCallId, ...input } = json;
	const parts = flatten(schema);
	const open = !parts.some(limitsExtraKeys) && (!schema.properties || parts.some(keepsExtraKeys));
	if (open) return input;

	return pick(
		input,
		parts.flatMap((part) => Object.keys(part.properties ?? {})),
	);
}
