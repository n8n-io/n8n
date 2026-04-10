import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';

/**
 * Convert a JSON Schema object to a compact human-readable text representation.
 * Used to inject schema information into LLM prompts without depending on Zod internals.
 */
export function jsonSchemaToCompactText(schema: JSONSchema7, indent = 0): string {
	const lines: string[] = [];
	serializeSchema(schema, '', false, indent, lines);
	return lines.join('\n');
}

function pad(indent: number): string {
	return '  '.repeat(indent);
}

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

function stringTypeLabel(schema: JSONSchema7): string {
	const constraints: string[] = [];
	const rangeLabel = buildRangeLabel(schema.minLength, schema.maxLength, 'chars');
	if (rangeLabel) constraints.push(rangeLabel);
	if (schema.pattern) constraints.push(`pattern: ${schema.pattern}`);
	return constraints.length > 0 ? `string [${constraints.join(', ')}]` : 'string';
}

function numericTypeLabel(type: 'integer' | 'number', schema: JSONSchema7): string {
	const rangeLabel = buildRangeLabel(schema.minimum, schema.maximum);
	return rangeLabel ? `${type} [${rangeLabel}]` : type;
}

function arrayTypeLabel(schema: JSONSchema7): string {
	if (schema.items && typeof schema.items === 'object' && !Array.isArray(schema.items)) {
		return `array of <${typeLabel(schema.items)}>`;
	}
	return 'array';
}

function objectTypeLabel(schema: JSONSchema7): string {
	if (schema.properties) {
		const requiredFields = new Set(schema.required ?? []);
		const parts: string[] = [];
		for (const [k, v] of Object.entries(schema.properties)) {
			if (typeof v !== 'object' || v === null) continue;
			const optSuffix = !requiredFields.has(k) ? '?' : '';
			parts.push(`${k}${optSuffix}: ${typeLabel(v)}`);
		}
		return `{ ${parts.join(', ')} }`;
	}
	if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
		return `Record<string, ${typeLabel(schema.additionalProperties)}>`;
	}
	return 'object';
}

function serializeSchema(
	schema: JSONSchema7,
	fieldName: string,
	optional: boolean,
	indent: number,
	lines: string[],
): void {
	const unionBranches = schema.anyOf ?? schema.oneOf;
	if (unionBranches?.length) {
		serializeUnion(unionBranches, fieldName, optional, indent, lines);
		return;
	}
	if (schema.type === 'object') {
		serializeObject(schema, fieldName, optional, indent, lines);
		return;
	}
	serializeLeaf(schema, fieldName, optional, indent, lines);
}

function serializeUnion(
	unionBranches: NonNullable<JSONSchema7['anyOf']>,
	fieldName: string,
	optional: boolean,
	indent: number,
	lines: string[],
): void {
	if (!fieldName) return;

	const objectBranches = unionBranches.filter(
		(b): b is JSONSchema7 => typeof b === 'object' && b !== null,
	);
	const discriminator = detectDiscriminator(objectBranches);
	const optSuffix = optional ? '?' : '';

	lines.push(
		`${pad(indent)}${fieldName}${optSuffix}: one of <discriminated by "${discriminator ?? 'type'}">`,
	);
	for (const branch of objectBranches) {
		const constProp = discriminator ? getConstValue(branch.properties?.[discriminator]) : undefined;
		const branchLabel =
			constProp !== undefined ? `${discriminator} = ${JSON.stringify(constProp)}` : '?';
		const branchFields: string[] = [];
		serializeBranchFields(branch, branchFields);
		lines.push(`${pad(indent)}  | ${branchLabel}: { ${branchFields.join(', ')} }`);
	}
}

function serializeObject(
	schema: JSONSchema7,
	fieldName: string,
	optional: boolean,
	indent: number,
	lines: string[],
): void {
	const prefix = pad(indent);
	const optSuffix = optional ? '?' : '';
	const requiredSuffix = optional ? '' : ' (required)';

	if (schema.properties) {
		if (fieldName) {
			lines.push(`${prefix}${fieldName}${optSuffix}: object${requiredSuffix}`);
		}
		const requiredFields = new Set(schema.required ?? []);
		for (const [propName, propSchema] of Object.entries(schema.properties)) {
			if (typeof propSchema !== 'object' || propSchema === null) continue;
			serializeSchema(propSchema, propName, !requiredFields.has(propName), indent + 1, lines);
		}
		if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
			lines.push(`${pad(indent + 1)}[key: string]: ${typeLabel(schema.additionalProperties)}`);
		}
		return;
	}

	if (schema.additionalProperties) {
		const { additionalProperties } = schema;
		const valType =
			typeof additionalProperties === 'object' && additionalProperties !== null
				? typeLabel(additionalProperties)
				: 'unknown';
		lines.push(`${prefix}${fieldName}${optSuffix}: Record<string, ${valType}>${requiredSuffix}`);
	}
}

function serializeLeaf(
	schema: JSONSchema7,
	fieldName: string,
	optional: boolean,
	indent: number,
	lines: string[],
): void {
	if (!fieldName) return;
	const optSuffix = optional ? '?' : '';
	const requiredSuffix = optional ? '' : ' (required)';
	const defaultSuffix =
		schema.default !== undefined ? ` (default: ${JSON.stringify(schema.default)})` : '';
	lines.push(
		`${pad(indent)}${fieldName}${optSuffix}: ${typeLabel(schema)}${requiredSuffix}${defaultSuffix}`,
	);
}

function serializeBranchFields(schema: JSONSchema7, out: string[]): void {
	if (!schema.properties) return;
	const requiredFields = new Set(schema.required ?? []);
	for (const [propName, propSchema] of Object.entries(schema.properties)) {
		if (typeof propSchema !== 'object' || propSchema === null) continue;
		const optSuffix = !requiredFields.has(propName) ? '?' : '';
		out.push(`${propName}${optSuffix}: ${typeLabel(propSchema)}`);
	}
}

function detectDiscriminator(branches: JSONSchema7[]): string | undefined {
	const [first] = branches;
	if (!first?.properties) return undefined;

	for (const propName of Object.keys(first.properties)) {
		if (getConstValue(first.properties[propName]) === undefined) continue;
		const allHaveConst = branches.every(
			(b) => b.properties && getConstValue(b.properties[propName]) !== undefined,
		);
		if (allHaveConst) return propName;
	}
	return undefined;
}

function getConstValue(schema: JSONSchema7Definition | undefined): unknown {
	if (typeof schema !== 'object' || schema === null) return undefined;
	if (schema.const !== undefined) return schema.const;
	if (schema.enum && schema.enum.length === 1) return schema.enum[0];
	return undefined;
}
