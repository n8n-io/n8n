import type { JSONSchema7 } from 'json-schema';

// Simple JSON schema generator
// Prioritizes performance and simplicity over supporting all JSON schema features
export function generateJsonSchema(json: unknown): JSONSchema7 {
	return inferType(json);
}

function isPrimitive(type: string): type is 'string' | 'number' | 'boolean' {
	return ['string', 'number', 'boolean'].includes(type);
}
function inferType(value: unknown): JSONSchema7 {
	if (value === null) return { type: 'null' };

	const type = typeof value;
	if (isPrimitive(type)) return { type };

	if (Array.isArray(value)) return inferArrayType(value);

	if (value && type === 'object') return inferObjectType(value);

	return { type: 'string' };
}

function inferArrayType(arr: unknown[]): JSONSchema7 {
	return {
		type: 'array',
		items: arr.length > 0 ? inferType(arr[0]) : {},
	};
}

function inferObjectType(obj: object): JSONSchema7 {
	const properties: JSONSchema7['properties'] = {};

	Object.entries(obj).forEach(([key, value]) => {
		properties[key] = inferType(value);
	});

	return {
		type: 'object',
		properties,
	};
}
