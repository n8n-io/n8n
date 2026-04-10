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

function typeLabel(schema: JSONSchema7): string {
	if (schema.enum) {
		return schema.enum.map((v) => JSON.stringify(v)).join(' | ');
	}
	if (schema.const !== undefined) {
		return JSON.stringify(schema.const);
	}

	const type = schema.type;
	if (type === 'string') {
		const constraints: string[] = [];
		if (schema.minLength !== undefined && schema.maxLength !== undefined) {
			constraints.push(`${schema.minLength}..${schema.maxLength} chars`);
		} else if (schema.minLength !== undefined) {
			constraints.push(`min ${schema.minLength} chars`);
		} else if (schema.maxLength !== undefined) {
			constraints.push(`max ${schema.maxLength} chars`);
		}
		if (schema.pattern) {
			constraints.push(`pattern: ${schema.pattern}`);
		}
		return constraints.length > 0 ? `string [${constraints.join(', ')}]` : 'string';
	}
	if (type === 'integer' || type === 'number') {
		const base = type;
		const constraints: string[] = [];
		if (schema.minimum !== undefined && schema.maximum !== undefined) {
			constraints.push(`${schema.minimum}..${schema.maximum}`);
		} else if (schema.minimum !== undefined) {
			constraints.push(`min ${schema.minimum}`);
		} else if (schema.maximum !== undefined) {
			constraints.push(`max ${schema.maximum}`);
		}
		return constraints.length > 0 ? `${base} [${constraints.join(', ')}]` : base;
	}
	if (type === 'boolean') return 'boolean';
	if (type === 'array') {
		if (schema.items && typeof schema.items === 'object' && !Array.isArray(schema.items)) {
			return `array of <${typeLabel(schema.items as JSONSchema7)}>`;
		}
		return 'array';
	}
	if (type === 'object') return 'object';
	return 'unknown';
}

function serializeSchema(
	schema: JSONSchema7,
	fieldName: string,
	optional: boolean,
	indent: number,
	lines: string[],
): void {
	const prefix = pad(indent);

	// Handle anyOf / oneOf (union types)
	const unionBranches = schema.anyOf ?? schema.oneOf;
	if (unionBranches && unionBranches.length > 0) {
		const discriminator = detectDiscriminator(
			unionBranches.filter((b): b is JSONSchema7 => typeof b === 'object' && b !== null),
		);

		if (fieldName) {
			const optSuffix = optional ? '?' : '';
			const defaultSuffix =
				schema.default !== undefined ? ` (default: ${JSON.stringify(schema.default)})` : '';
			const requiredSuffix = optional ? '' : ' (required)';
			lines.push(
				`${prefix}${fieldName}${optSuffix}: array of <discriminated by "${discriminator ?? 'type'}">`,
			);
			// Emit union branches inline
			for (const branch of unionBranches) {
				if (typeof branch !== 'object' || branch === null) continue;
				const b = branch as JSONSchema7;
				const constProp = discriminator ? findConstInProperties(b, discriminator) : undefined;
				const branchLabel =
					constProp !== undefined ? `${discriminator} = ${JSON.stringify(constProp)}` : '?';
				const branchFields: string[] = [];
				serializeBranchFields(b, branchFields);
				lines.push(`${prefix}  | ${branchLabel}: { ${branchFields.join(', ')} }`);
			}
			void defaultSuffix;
			void requiredSuffix;
		}
		return;
	}

	const type = schema.type;

	if (type === 'object' && schema.properties) {
		if (fieldName) {
			const optSuffix = optional ? '?' : '';
			const requiredSuffix = optional ? '' : ' (required)';
			lines.push(`${prefix}${fieldName}${optSuffix}: object${requiredSuffix}`);
		}
		const requiredFields = new Set(schema.required ?? []);
		for (const [propName, propSchema] of Object.entries(schema.properties)) {
			if (typeof propSchema !== 'object' || propSchema === null) continue;
			serializeSchema(
				propSchema as JSONSchema7,
				propName,
				!requiredFields.has(propName),
				indent + 1,
				lines,
			);
		}
		if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
			const valType = typeLabel(schema.additionalProperties as JSONSchema7);
			lines.push(`${pad(indent + 1)}[key: string]: ${valType}`);
		}
		return;
	}

	if (type === 'object' && schema.additionalProperties) {
		const valSchema = schema.additionalProperties;
		const valType =
			typeof valSchema === 'object' && valSchema !== null
				? typeLabel(valSchema as JSONSchema7)
				: 'unknown';
		const optSuffix = optional ? '?' : '';
		const requiredSuffix = optional ? '' : ' (required)';
		lines.push(`${prefix}${fieldName}${optSuffix}: Record<string, ${valType}>${requiredSuffix}`);
		return;
	}

	if (fieldName) {
		const optSuffix = optional ? '?' : '';
		const requiredSuffix = optional ? '' : ' (required)';
		const defaultSuffix =
			schema.default !== undefined ? ` (default: ${JSON.stringify(schema.default)})` : '';
		lines.push(
			`${prefix}${fieldName}${optSuffix}: ${typeLabel(schema)}${requiredSuffix}${defaultSuffix}`,
		);
	}
}

function serializeBranchFields(schema: JSONSchema7, out: string[]): void {
	if (!schema.properties) return;
	const requiredFields = new Set(schema.required ?? []);
	for (const [propName, propSchema] of Object.entries(schema.properties)) {
		if (typeof propSchema !== 'object' || propSchema === null) continue;
		const s = propSchema as JSONSchema7;
		const optSuffix = !requiredFields.has(propName) ? '?' : '';
		out.push(`${propName}${optSuffix}: ${typeLabel(s)}`);
	}
}

function detectDiscriminator(branches: JSONSchema7[]): string | undefined {
	if (branches.length === 0) return undefined;
	const first = branches[0];
	if (!first.properties) return undefined;

	for (const propName of Object.keys(first.properties)) {
		const firstConst = getConstValue(first.properties[propName]);
		if (firstConst === undefined) continue;
		const allHaveConst = branches.every((b) => {
			if (!b.properties) return false;
			return getConstValue(b.properties[propName]) !== undefined;
		});
		if (allHaveConst) return propName;
	}
	return undefined;
}

function getConstValue(schema: JSONSchema7Definition | undefined): unknown {
	if (typeof schema !== 'object' || schema === null) return undefined;
	const s = schema as JSONSchema7;
	if (s.const !== undefined) return s.const;
	if (s.enum && s.enum.length === 1) return s.enum[0];
	return undefined;
}

function findConstInProperties(schema: JSONSchema7, propName: string): unknown {
	if (!schema.properties) return undefined;
	return getConstValue(schema.properties[propName]);
}
