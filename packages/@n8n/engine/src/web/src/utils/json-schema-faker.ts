import { faker } from '@faker-js/faker';

interface JsonSchema {
	type?: string;
	properties?: Record<string, JsonSchema>;
	required?: string[];
	items?: JsonSchema;
	enum?: string[];
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	default?: unknown;
}

/**
 * Generates a realistic fake value from a JSON Schema definition.
 * Uses field names as hints for semantic faker methods.
 */
export function generateFromSchema(schema: JsonSchema, fieldName?: string): unknown {
	if (schema.default !== undefined) return schema.default;

	if (schema.enum && schema.enum.length > 0) {
		return faker.helpers.arrayElement(schema.enum);
	}

	switch (schema.type) {
		case 'string':
			return generateString(fieldName, schema);
		case 'number':
			return faker.number.int({
				min: schema.minimum ?? 1,
				max: schema.maximum ?? 100,
			});
		case 'boolean':
			return faker.datatype.boolean();
		case 'array':
			return schema.items
				? Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () =>
						generateFromSchema(schema.items!),
					)
				: [];
		case 'object':
			return generateObject(schema);
		default:
			return null;
	}
}

function generateObject(schema: JsonSchema): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	if (!schema.properties) return result;

	for (const [key, propSchema] of Object.entries(schema.properties)) {
		result[key] = generateFromSchema(propSchema, key);
	}
	return result;
}

function generateString(fieldName?: string, schema?: JsonSchema): string {
	const name = fieldName?.toLowerCase() ?? '';

	// Use field name hints for realistic data
	if (name.includes('email')) return faker.internet.email();
	if (name.includes('name') && name.includes('first')) return faker.person.firstName();
	if (name.includes('name') && name.includes('last')) return faker.person.lastName();
	if (name.includes('name')) return faker.person.fullName();
	if (name.includes('url') || name.includes('link')) return faker.internet.url();
	if (name.includes('phone')) return faker.phone.number();
	if (name.includes('address')) return faker.location.streetAddress();
	if (name.includes('city')) return faker.location.city();
	if (name.includes('country')) return faker.location.country();
	if (name.includes('description') || name.includes('text') || name.includes('content'))
		return faker.lorem.sentence();
	if (name.includes('title') || name.includes('subject')) return faker.lorem.words(3);
	if (name.includes('id')) return faker.string.uuid();
	if (name.includes('token') || name.includes('key') || name.includes('secret'))
		return faker.string.alphanumeric(32);
	if (name.includes('date') || name.includes('time')) return faker.date.recent().toISOString();
	if (name.includes('message')) return faker.lorem.sentence();
	if (name.includes('color') || name.includes('colour')) return faker.color.rgb();
	if (name.includes('image') || name.includes('avatar')) return faker.image.url();

	const min = schema?.minLength ?? 1;
	const max = schema?.maxLength ?? 50;
	// Generate a word/sentence that fits length constraints
	if (max <= 10) return faker.lorem.word().slice(0, max);
	return faker.lorem.words(Math.ceil(min / 5)).slice(0, max);
}

/**
 * Generates complete fake request data (body, query, headers) from a trigger's schema config.
 */
export function generateWebhookTestData(schema: {
	body?: JsonSchema;
	query?: JsonSchema;
	headers?: JsonSchema;
}): {
	body: Record<string, unknown>;
	query: Record<string, unknown>;
	headers: Record<string, unknown>;
} {
	return {
		body: schema.body ? (generateFromSchema(schema.body) as Record<string, unknown>) : {},
		query: schema.query ? (generateFromSchema(schema.query) as Record<string, unknown>) : {},
		headers: schema.headers ? (generateFromSchema(schema.headers) as Record<string, unknown>) : {},
	};
}
