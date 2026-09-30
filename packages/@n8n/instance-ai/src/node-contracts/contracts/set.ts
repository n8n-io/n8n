import { bool, obj, record, str, strList, tagOf, variant } from '../helpers';
import type { ActionContract, JsonSchema } from '../types';

const FIELD_TYPES = ['string', 'number', 'boolean', 'array', 'object'] as const;

function outputForFieldType(type: string): JsonSchema {
	if (type === 'object') return { type: 'object', additionalProperties: true };
	const known = FIELD_TYPES.find((fieldType) => fieldType === type);
	return known ? { type: known } : {};
}

interface Field {
	name: string;
	type: string;
}

function readFields(value: unknown): Field[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		const { name, type } = record(item);
		return typeof name === 'string' && typeof type === 'string' ? [{ name, type }] : [];
	});
}

/** Dot notation nests: `a.b` sets `{ a: { b } }`, the node's default behaviour. */
function withField(schema: JsonSchema, path: string[], leaf: JsonSchema): JsonSchema {
	const [head, ...rest] = path;
	const properties = schema.properties ?? {};
	const child =
		rest.length === 0 ? leaf : withField(properties[head] ?? { type: 'object' }, rest, leaf);
	return { ...schema, type: 'object', properties: { ...properties, [head]: child } };
}

/** The input fields a keep mode passes through. Unknown upstream shapes stay open. */
function keptInput(mode: string, keepFields: unknown, upstream?: JsonSchema): JsonSchema {
	if (mode === 'none') return { type: 'object', properties: {}, additionalProperties: false };
	if (!upstream?.properties) return { type: 'object', properties: {}, additionalProperties: true };
	const names = Array.isArray(keepFields) ? keepFields.filter((f) => typeof f === 'string') : [];
	const keeps = (key: string) =>
		mode === 'all' || (mode === 'selected' ? names.includes(key) : !names.includes(key));
	const properties = Object.fromEntries(
		Object.entries(upstream.properties).filter(([key]) => keeps(key)),
	);
	const required = (upstream.required ?? []).filter((key) => key in properties);
	return mode === 'selected'
		? { type: 'object', properties, required, additionalProperties: false }
		: { ...upstream, properties, required };
}

export const setFields: ActionContract = {
	id: 'set.fields',
	node: 'set',
	action: 'Set fields',
	summary: 'Set named fields on each item. Output has exactly these fields unless keep is set.',
	flow: { effect: 'transform', cardinality: 'per-item', passthrough: 'replace', idempotent: true },
	credentials: [],
	input: obj(
		{
			fields: {
				type: 'array',
				minItems: 1,
				items: obj(
					{
						name: str('Dot notation nests: "a.b" sets { a: { b } }', { minLength: 1 }),
						value: { 'x-n8n-hint': 'Literal or ={{ expression }}' },
						type: {
							enum: FIELD_TYPES,
							'x-n8n-hint': "Type of the value's result; expressions are checked against it",
						},
					},
					['name', 'value', 'type'],
				),
			},
			keep: variant(
				'mode',
				{
					none: { hint: 'Output only the fields above (default)' },
					all: { hint: 'Also keep every input field' },
					selected: { properties: { fields: strList() }, required: ['fields'] },
					except: { properties: { fields: strList() }, required: ['fields'] },
				},
				{ default: { mode: 'none' } },
			),
			dotNotation: bool({ default: true }),
		},
		['fields'],
	),
	output: { type: 'object', additionalProperties: true },
	deriveOutput: (input, upstream) => {
		const base = keptInput(
			tagOf(input.keep, 'mode') ?? 'none',
			record(input.keep).fields,
			upstream,
		);
		return readFields(input.fields).reduce(
			(schema, field) =>
				withField(
					schema,
					input.dotNotation === false ? [field.name] : field.name.split('.'),
					outputForFieldType(field.type),
				),
			base,
		);
	},
	example: {
		fields: [
			{ name: 'email', value: '={{ $json.contact.email }}', type: 'string' },
			{ name: 'priority', value: 'normal', type: 'string' },
		],
	},
	compile: {
		type: 'n8n-nodes-base.set',
		typeVersion: 3.5,
		discriminators: { mode: 'manual' },
		parameters: (input) => {
			const keepMode = tagOf(input.keep, 'mode') ?? 'none';
			const keptFields = record(input.keep).fields;
			const fieldList = Array.isArray(keptFields) ? keptFields.join(',') : undefined;
			return {
				mode: 'manual',
				assignments: {
					assignments: (Array.isArray(input.fields) ? input.fields : []).map((field, index) => ({
						id: `assignment-${index}`,
						...record(field),
					})),
				},
				includeOtherFields: keepMode !== 'none',
				...(keepMode === 'selected' ? { include: 'selected', includeFields: fieldList } : {}),
				...(keepMode === 'except' ? { include: 'except', excludeFields: fieldList } : {}),
				options: input.dotNotation === false ? { dotNotation: false } : {},
			};
		},
	},
};
