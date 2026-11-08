import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import get from 'lodash/get';
import type { IDataObject } from 'n8n-workflow';

const annotations = new Set([
	'title',
	'description',
	'default',
	'examples',
	'$comment',
	'readOnly',
	'writeOnly',
	'deprecated',
]);

const acceptsAnyValue = (schema: JSONSchema7Definition) =>
	schema === true ||
	(typeof schema === 'object' && Object.keys(schema).every((key) => annotations.has(key)));

const rejectsAnyValue = (schema: JSONSchema7Definition) =>
	schema === false ||
	(typeof schema === 'object' && schema.not !== undefined && acceptsAnyValue(schema.not));

const resolveRef = (root: JSONSchema7, ref: string): unknown =>
	ref.startsWith('#/')
		? get(
				root,
				ref
					.slice(2)
					.split('/')
					.map((segment) => decodeURIComponent(segment).replace(/~1/g, '/').replace(/~0/g, '~')),
			)
		: undefined;

const collectParts = (
	schema: JSONSchema7,
	root: JSONSchema7,
	seen: Set<JSONSchema7>,
): JSONSchema7[] => {
	if (seen.has(schema)) return [];
	seen.add(schema);
	const members = [
		schema.$ref === undefined ? undefined : resolveRef(root, schema.$ref),
		...(schema.allOf ?? []),
		...(schema.anyOf ?? []),
		...(schema.oneOf ?? []),
		schema.then,
		schema.else,
	];
	return [
		schema,
		...members
			.filter((member): member is JSONSchema7 => typeof member === 'object' && member !== null)
			.flatMap((member) => collectParts(member, root, seen)),
	];
};

const opensExtraKeys = ({ additionalProperties }: JSONSchema7) =>
	additionalProperties !== undefined && acceptsAnyValue(additionalProperties);

const limitsExtraKeys = ({ additionalProperties, patternProperties }: JSONSchema7) =>
	(additionalProperties !== undefined && !acceptsAnyValue(additionalProperties)) ||
	Object.keys(patternProperties ?? {}).length > 0;

const closesExtraKeys = ({ additionalProperties, patternProperties }: JSONSchema7) =>
	additionalProperties !== undefined &&
	rejectsAnyValue(additionalProperties) &&
	!Object.keys(patternProperties ?? {}).length;

export function toToolInput(schema: JSONSchema7 | undefined, json: IDataObject): IDataObject {
	if (!schema) return json;

	const { toolCallId, ...input } = json;
	const parts = collectParts(schema, schema, new Set());
	const keys = new Set(parts.flatMap((part) => Object.keys(part.properties ?? {})));
	const open = keys.size
		? parts.some(opensExtraKeys) && !parts.some(limitsExtraKeys)
		: !parts.some(closesExtraKeys);
	if (open) return input;

	return Object.fromEntries(Object.entries(input).filter(([key]) => keys.has(key)));
}
