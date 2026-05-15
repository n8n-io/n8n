import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';

/**
 * Convert a JSON Schema object to a compact human-readable text representation.
 * Used to inject schema information into LLM prompts without depending on Zod internals.
 *
 * @example
 * jsonSchemaToCompactText({
 *   type: 'object',
 *   properties: { name: { type: 'string' }, age: { type: 'integer' } },
 *   required: ['name'],
 * });
 * // →
 * //   name: string (required)
 * //   age?: integer
 */
export function jsonSchemaToCompactText(schema: JSONSchema7, indent = 0): string {
	return serializeSchema(schema, '', false, indent).join('\n');
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function pad(level: number): string {
	return '  '.repeat(level);
}

/** Returns `"name?: "` or `"name: "` depending on optionality. */
function fieldPrefix(name: string, optional: boolean): string {
	return `${name}${optional ? '?' : ''}: `;
}

/**
 * Formats a numeric range as a compact label.
 *
 * @example
 * buildRangeLabel(1, 36, 'chars') // → "1..36 chars"
 * buildRangeLabel(0, undefined)   // → "min 0"
 * buildRangeLabel(undefined, 100) // → "max 100"
 * buildRangeLabel(undefined, undefined) // → undefined
 */
function buildRangeLabel(
	min: number | undefined,
	max: number | undefined,
	unit = '',
): string | undefined {
	const suffix = unit ? ` ${unit}` : '';
	if (min !== undefined && max !== undefined) return `${min}..${max}${suffix}`;
	if (min !== undefined) return `min ${min}${suffix}`;
	if (max !== undefined) return `max ${max}${suffix}`;
	return undefined;
}

// ---------------------------------------------------------------------------
// Type labels — inline one-line representations
// ---------------------------------------------------------------------------

/**
 * Produces a compact inline type string for a schema node.
 * Used both directly for leaf fields and to summarise branch shapes inside union labels.
 *
 * @example
 * typeLabel({ enum: ['red', 'blue'] })               // → '"red" | "blue"'
 * typeLabel({ const: 'click' })                       // → '"click"'
 * typeLabel({ anyOf: [{ type: 'string' }, { type: 'number' }] }) // → 'string | number'
 * typeLabel({ type: 'string', minLength: 1 })         // → 'string [min 1 chars]'
 * typeLabel({ type: 'array', items: { type: 'boolean' } })       // → 'array of <boolean>'
 */
function typeLabel(schema: JSONSchema7): string {
	if (schema.enum) return schema.enum.map((v) => JSON.stringify(v)).join(' | ');
	if (schema.const !== undefined) return JSON.stringify(schema.const);

	const unionBranches = schema.anyOf ?? schema.oneOf;
	if (unionBranches) {
		return unionBranches
			.filter((b): b is JSONSchema7 => typeof b === 'object' && b !== null)
			.map((b) => typeLabel(b))
			.join(' | ');
	}

	const { type } = schema;
	if (type === 'string') return stringTypeLabel(schema);
	if (type === 'integer' || type === 'number') return numericTypeLabel(type, schema);
	if (type === 'boolean') return 'boolean';
	if (type === 'array') return arrayTypeLabel(schema);
	if (type === 'object') return objectTypeLabel(schema);
	return 'unknown';
}

/**
 * @example
 * stringTypeLabel({ type: 'string' })                              // → 'string'
 * stringTypeLabel({ type: 'string', minLength: 2, maxLength: 20 }) // → 'string [2..20 chars]'
 * stringTypeLabel({ type: 'string', pattern: '^\\w+$' })           // → 'string [pattern: ^\w+$]'
 */
function stringTypeLabel(schema: JSONSchema7): string {
	const constraints: string[] = [];
	const rangeLabel = buildRangeLabel(schema.minLength, schema.maxLength, 'chars');
	if (rangeLabel) constraints.push(rangeLabel);
	if (schema.pattern) constraints.push(`pattern: ${schema.pattern}`);
	return constraints.length > 0 ? `string [${constraints.join(', ')}]` : 'string';
}

/**
 * @example
 * numericTypeLabel('integer', { minimum: 1, maximum: 5 }) // → 'integer [1..5]'
 * numericTypeLabel('number', { maximum: 1 })              // → 'number [max 1]'
 * numericTypeLabel('number', {})                          // → 'number'
 */
function numericTypeLabel(type: 'integer' | 'number', schema: JSONSchema7): string {
	const rangeLabel = buildRangeLabel(schema.minimum, schema.maximum);
	return rangeLabel ? `${type} [${rangeLabel}]` : type;
}

/**
 * @example
 * arrayTypeLabel({ type: 'array', items: { type: 'string' } }) // → 'array of <string>'
 * arrayTypeLabel({ type: 'array' })                            // → 'array'
 */
function arrayTypeLabel(schema: JSONSchema7): string {
	if (schema.items && typeof schema.items === 'object' && !Array.isArray(schema.items)) {
		return `array of <${typeLabel(schema.items)}>`;
	}
	return 'array';
}

/**
 * Used when an object appears inline (e.g. as a union branch summary or nested field type).
 * Emits a flat `{ k: type, k?: type }` summary rather than expanding to multiple lines.
 *
 * @example
 * // Named properties → inline shape
 * objectTypeLabel({ type: 'object', properties: { x: { type: 'number' } }, required: ['x'] })
 * // → '{ x: number }'
 *
 * // No properties, only additionalProperties → Record
 * objectTypeLabel({ type: 'object', additionalProperties: { type: 'string' } })
 * // → 'Record<string, string>'
 */
function objectTypeLabel(schema: JSONSchema7): string {
	if (schema.properties) {
		const required = new Set(schema.required ?? []);
		const parts = Object.entries(schema.properties)
			.filter(
				(entry): entry is [string, JSONSchema7] =>
					typeof entry[1] === 'object' && entry[1] !== null,
			)
			.map(([k, v]) => `${k}${required.has(k) ? '' : '?'}: ${typeLabel(v)}`);
		return `{ ${parts.join(', ')} }`;
	}
	if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
		return `Record<string, ${typeLabel(schema.additionalProperties)}>`;
	}
	return 'object';
}

// ---------------------------------------------------------------------------
// Multi-line serializers — each returns string[] for its schema node
// ---------------------------------------------------------------------------

/**
 * Central dispatcher: routes a schema node to the right multi-line serializer.
 * Returns an empty array when the schema cannot produce output (e.g. a top-level union without a fieldName).
 */
function serializeSchema(
	schema: JSONSchema7,
	fieldName: string,
	optional: boolean,
	level: number,
): string[] {
	const unionBranches = schema.anyOf ?? schema.oneOf;
	if (unionBranches?.length) return serializeUnion(schema, fieldName, optional, level);
	if (schema.type === 'object') return serializeObject(schema, fieldName, optional, level);
	if (schema.type === 'array' && hasUnionItems(schema)) {
		return serializeArrayUnion(schema, fieldName, optional, level);
	}
	return serializeLeaf(schema, fieldName, optional, level);
}

/**
 * Emits a single line for any scalar field (string, number, boolean, enum, const, plain array).
 *
 * @example
 * serializeLeaf({ type: 'string' }, 'name', false, 1)
 * // → ['  name: string (required)']
 *
 * serializeLeaf({ type: 'integer', default: 0 }, 'count', true, 1)
 * // → ['  count?: integer (default: 0)']
 */
function serializeLeaf(
	schema: JSONSchema7,
	fieldName: string,
	optional: boolean,
	level: number,
): string[] {
	if (!fieldName) return [];
	const requiredSuffix = optional ? '' : ' (required)';
	const defaultSuffix =
		schema.default !== undefined ? ` (default: ${JSON.stringify(schema.default)})` : '';
	return [
		`${pad(level)}${fieldPrefix(fieldName, optional)}${typeLabel(schema)}${requiredSuffix}${defaultSuffix}`,
	];
}

/**
 * Emits a header line for a named object field (or nothing for the top-level schema),
 * then recurses into each property, and finally appends a catch-all line when
 * `additionalProperties` is also present.
 *
 * @example
 * // Named field with properties
 * serializeObject({ type: 'object', properties: { street: { type: 'string' } }, required: ['street'] }, 'address', false, 1)
 * // → [
 * //     '  address: object (required)',
 * //     '    street: string (required)',
 * //   ]
 *
 * // Top-level object (no fieldName) — header suppressed
 * serializeObject({ type: 'object', properties: { x: { type: 'number' } } }, '', false, 0)
 * // → ['  x?: number']
 *
 * // additionalProperties only → Record
 * serializeObject({ type: 'object', additionalProperties: { type: 'string' } }, 'data', true, 1)
 * // → ['  data?: Record<string, string>']
 *
 * // Mixed properties + additionalProperties → catch-all appended
 * serializeObject({ type: 'object', properties: { baseline: { type: 'number' } }, required: ['baseline'], additionalProperties: { type: 'number' } }, '', false, 0)
 * // → [
 * //     '  baseline: number (required)',
 * //     '  [key: string]: number',
 * //   ]
 */
function serializeObject(
	schema: JSONSchema7,
	fieldName: string,
	optional: boolean,
	level: number,
): string[] {
	const requiredSuffix = optional ? '' : ' (required)';

	if (schema.properties) {
		const header = fieldName
			? [`${pad(level)}${fieldPrefix(fieldName, optional)}object${requiredSuffix}`]
			: [];
		const required = new Set(schema.required ?? []);
		const propertyLines = Object.entries(schema.properties).flatMap(([propName, propSchema]) => {
			if (typeof propSchema !== 'object' || propSchema === null) return [];
			return serializeSchema(propSchema, propName, !required.has(propName), level + 1);
		});
		const catchAll =
			schema.additionalProperties && typeof schema.additionalProperties === 'object'
				? [`${pad(level + 1)}[key: string]: ${typeLabel(schema.additionalProperties)}`]
				: [];
		return [...header, ...propertyLines, ...catchAll];
	}

	if (schema.additionalProperties) {
		const valType =
			typeof schema.additionalProperties === 'object' && schema.additionalProperties !== null
				? typeLabel(schema.additionalProperties)
				: 'unknown';
		return [
			`${pad(level)}${fieldPrefix(fieldName, optional)}Record<string, ${valType}>${requiredSuffix}`,
		];
	}

	return [];
}

/**
 * Emits a discriminated-union block for `anyOf` / `oneOf` fields.
 * Each branch is summarised on a single `| label: { fields }` line.
 * Returns empty when there is no `fieldName` (top-level union schemas are not rendered).
 *
 * @example
 * serializeUnion(
 *   [
 *     { type: 'object', properties: { type: { const: 'click' }, x: { type: 'number' } }, required: ['type', 'x'] },
 *     { type: 'object', properties: { type: { const: 'key' },   char: { type: 'string' } }, required: ['type', 'char'] },
 *   ],
 *   'action', false, 1,
 * )
 * // → [
 * //     '  action?: one of <discriminated by "type">',
 * //     '    | type = "click": { type: "click", x: number }',
 * //     '    | type = "key": { type: "key", char: string }',
 * //   ]
 */
function serializeUnion(
	schema: JSONSchema7,
	fieldName: string,
	optional: boolean,
	level: number,
): string[] {
	if (!fieldName) return [];

	const objectBranches = (schema.anyOf ?? schema.oneOf ?? []).filter(
		(b): b is JSONSchema7 => typeof b === 'object' && b !== null,
	);
	const discriminator = detectDiscriminator(objectBranches);
	const requiredSuffix = optional ? '' : ' (required)';
	const defaultSuffix =
		schema.default !== undefined ? ` (default: ${JSON.stringify(schema.default)})` : '';
	const header = `${pad(level)}${fieldPrefix(fieldName, optional)}one of <discriminated by "${discriminator ?? 'type'}">${requiredSuffix}${defaultSuffix}`;

	const branchLines = objectBranches.map((branch) => {
		const constProp = discriminator ? getConstValue(branch.properties?.[discriminator]) : undefined;
		const branchLabel =
			constProp !== undefined ? `${discriminator} = ${JSON.stringify(constProp)}` : '?';
		const fields = serializeBranchFields(branch);
		return `${pad(level)}  | ${branchLabel}: { ${fields.join(', ')} }`;
	});

	return [header, ...branchLines];
}

/**
 * Emits a multi-line block for arrays whose `items` is a union (`anyOf` / `oneOf`).
 * Each branch is rendered on its own indented line via `serializeArrayUnionBranch`.
 *
 * @example
 * // Scalar union items
 * serializeArrayUnion({ type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'number' }] } }, 'vals', true, 1)
 * // → [
 * //     '  vals?: array with items any of:',
 * //     '    | string',
 * //     '    | number',
 * //   ]
 *
 * // Object union items (see serializeArrayUnionBranch for the expanded shape)
 * // → '  events?: array with items any of:'
 * //   '    | (kind = "click")'
 * //   '      x: number (required)'
 */
function serializeArrayUnion(
	schema: JSONSchema7,
	fieldName: string,
	optional: boolean,
	level: number,
): string[] {
	if (!fieldName) return [];

	const items = schema.items as JSONSchema7;
	const branches = (items.anyOf ?? items.oneOf ?? []).filter(
		(b): b is JSONSchema7 => typeof b === 'object' && b !== null,
	);
	const discriminator = detectDiscriminator(branches);
	const requiredSuffix = optional ? '' : ' (required)';
	const defaultSuffix =
		schema.default !== undefined ? ` (default: ${JSON.stringify(schema.default)})` : '';
	const header = `${pad(level)}${fieldPrefix(fieldName, optional)}array with items any of:${requiredSuffix}${defaultSuffix}`;
	const branchLines = branches.flatMap((branch) =>
		serializeArrayUnionBranch(branch, discriminator, level),
	);

	return [header, ...branchLines];
}

/**
 * Renders a single branch of an array-item union.
 *
 * - Scalar branch (no `properties`): single `| type` line.
 * - Object branch: a `| (discriminator = value)` header followed by the branch's
 *   own properties expanded on indented lines (the discriminator field itself is omitted
 *   from the body since it is already captured in the header label).
 *
 * @example
 * // Scalar branch
 * serializeArrayUnionBranch({ type: 'string' }, undefined, 1)
 * // → ['    | string']
 *
 * // Object branch with discriminator
 * serializeArrayUnionBranch(
 *   { type: 'object', properties: { kind: { const: 'click' }, x: { type: 'number' } }, required: ['kind', 'x'] },
 *   'kind', 1,
 * )
 * // → [
 * //     '    | (kind = "click")',
 * //     '      x: number (required)',
 * //   ]
 */
function serializeArrayUnionBranch(
	branch: JSONSchema7,
	discriminator: string | undefined,
	level: number,
): string[] {
	if (!branch.properties) {
		return [`${pad(level)}  | ${typeLabel(branch)}`];
	}

	const constProp = discriminator ? getConstValue(branch.properties[discriminator]) : undefined;
	const branchLabel =
		constProp !== undefined ? `${discriminator} = ${JSON.stringify(constProp)}` : '?';
	const required = new Set(branch.required ?? []);

	const fieldLines = Object.entries(branch.properties).flatMap(([propName, propSchema]) => {
		if (typeof propSchema !== 'object' || propSchema === null) return [];
		if (propName === discriminator) return [];
		return serializeSchema(propSchema, propName, !required.has(propName), level + 2);
	});

	return [`${pad(level)}  | (${branchLabel})`, ...fieldLines];
}

// ---------------------------------------------------------------------------
// Discriminator helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the array schema's `items` is itself a union (`anyOf` / `oneOf`),
 * meaning the array needs multi-line branch expansion rather than a simple inline label.
 *
 * @example
 * hasUnionItems({ type: 'array', items: { anyOf: [{ type: 'string' }] } }) // → true
 * hasUnionItems({ type: 'array', items: { type: 'string' } })              // → false
 * hasUnionItems({ type: 'array' })                                         // → false
 */
function hasUnionItems(schema: JSONSchema7): boolean {
	const { items } = schema;
	if (!items || typeof items !== 'object' || Array.isArray(items)) return false;
	return !!(items.anyOf?.length ?? items.oneOf?.length);
}

/**
 * Finds the first property whose value is a const (or single-value enum) in every branch —
 * this is the discriminator field that uniquely identifies each variant.
 * Returns `undefined` when no such property exists across all branches.
 *
 * @example
 * detectDiscriminator([
 *   { type: 'object', properties: { type: { const: 'click' }, x: { type: 'number' } } },
 *   { type: 'object', properties: { type: { const: 'key' },   y: { type: 'number' } } },
 * ])
 * // → 'type'
 *
 * detectDiscriminator([
 *   { type: 'object', properties: { a: { type: 'string' } } },
 *   { type: 'object', properties: { b: { type: 'number' } } },
 * ])
 * // → undefined  (no shared const property)
 */
function detectDiscriminator(branches: JSONSchema7[]): string | undefined {
	const [first] = branches;
	const { properties } = first ?? {};
	if (!properties) return undefined;

	return Object.keys(properties).find((propName) => {
		if (getConstValue(properties[propName]) === undefined) return false;
		return branches.every(
			(b) => b.properties && getConstValue(b.properties[propName]) !== undefined,
		);
	});
}

/**
 * Extracts a fixed constant from a schema property definition.
 * A single-value `enum` is treated the same as `const` since both pin the field to one value.
 *
 * @example
 * getConstValue({ const: 'click' })   // → 'click'
 * getConstValue({ enum: ['start'] })  // → 'start'
 * getConstValue({ enum: ['a', 'b'] }) // → undefined  (not a single value)
 * getConstValue({ type: 'string' })   // → undefined
 */
function getConstValue(schema: JSONSchema7Definition | undefined): unknown {
	if (typeof schema !== 'object' || schema === null) return undefined;
	if (schema.const !== undefined) return schema.const;
	if (schema.enum && schema.enum.length === 1) return schema.enum[0];
	return undefined;
}

/**
 * Renders all properties of a branch as an inline comma-separated list.
 * Used to produce the `{ field: type, field?: type }` part of a union branch label.
 *
 * @example
 * serializeBranchFields({
 *   type: 'object',
 *   properties: { type: { const: 'click' }, x: { type: 'number' }, label: { type: 'string' } },
 *   required: ['type', 'x'],
 * })
 * // → ['type: "click"', 'x: number', 'label?: string']
 */
function serializeBranchFields(schema: JSONSchema7): string[] {
	if (!schema.properties) return [];
	const required = new Set(schema.required ?? []);
	return Object.entries(schema.properties)
		.filter(
			(entry): entry is [string, JSONSchema7] => typeof entry[1] === 'object' && entry[1] !== null,
		)
		.map(
			([propName, propSchema]) =>
				`${propName}${required.has(propName) ? '' : '?'}: ${typeLabel(propSchema)}`,
		);
}
