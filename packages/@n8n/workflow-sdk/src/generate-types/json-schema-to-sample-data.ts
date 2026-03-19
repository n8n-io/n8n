/**
 * JSON Schema to Sample Data Generator
 *
 * Generates concrete sample values from JSON Schema definitions.
 * Uses property-name heuristics to produce realistic test data
 * (e.g., "email" → "test@example.com", "id" → "abc123").
 */

import type { JsonSchema } from './generate-types';

// =============================================================================
// Property-Name Heuristics
// =============================================================================

/**
 * Map of property name patterns to sample values.
 * Patterns are matched case-insensitively against the property key.
 * More specific patterns should come first.
 */
const STRING_HEURISTICS: Array<{ pattern: RegExp; value: string }> = [
	// Email
	{ pattern: /e[-_]?mail/i, value: 'test@example.com' },
	// URLs
	{ pattern: /\burl\b|href|link|website|homepage/i, value: 'https://example.com' },
	{
		pattern: /avatar|image[-_]?url|photo[-_]?url|icon[-_]?url|thumbnail/i,
		value: 'https://example.com/image.png',
	},
	// Identifiers
	{ pattern: /^id$|[-_]id$/i, value: 'abc123' },
	{ pattern: /uuid|guid/i, value: '550e8400-e29b-41d4-a716-446655440000' },
	// Names
	{ pattern: /first[-_]?name/i, value: 'Jane' },
	{ pattern: /last[-_]?name|surname/i, value: 'Doe' },
	{ pattern: /display[-_]?name|full[-_]?name|user[-_]?name|username/i, value: 'Jane Doe' },
	{ pattern: /\bname\b/i, value: 'Test Item' },
	// Contact
	{ pattern: /phone|tel(?:ephone)?|mobile|fax/i, value: '+1-555-0100' },
	// Date/Time
	{
		pattern: /created[-_]?at|updated[-_]?at|date[-_]?time|timestamp|started[-_]?at|stopped[-_]?at/i,
		value: '2025-01-01T00:00:00.000Z',
	},
	{ pattern: /\bdate\b/i, value: '2025-01-01' },
	{ pattern: /\btime\b/i, value: '12:00:00' },
	{ pattern: /timezone|time[-_]?zone|tz/i, value: 'UTC' },
	// Location
	{ pattern: /country/i, value: 'US' },
	{ pattern: /city/i, value: 'New York' },
	{ pattern: /state|province|region/i, value: 'NY' },
	{ pattern: /zip|postal/i, value: '10001' },
	{ pattern: /address/i, value: '123 Main St' },
	{ pattern: /latitude|lat/i, value: '40.7128' },
	{ pattern: /longitude|lng|lon/i, value: '-74.0060' },
	// Content
	{ pattern: /title|subject|headline/i, value: 'Sample Title' },
	{ pattern: /description|summary|bio|about/i, value: 'Sample description text' },
	{ pattern: /body|content|text|message/i, value: 'Sample content' },
	// Auth/tokens
	{ pattern: /token|api[-_]?key|secret|password/i, value: 'test-token-xxx' },
	// Status
	{ pattern: /status|state/i, value: 'active' },
	{ pattern: /type|kind|category/i, value: 'default' },
	// Currency
	{ pattern: /currency/i, value: 'USD' },
	{ pattern: /amount|price|total|cost/i, value: '100.00' },
	// Language
	{ pattern: /lang(?:uage)?|locale/i, value: 'en' },
	// Color
	{ pattern: /colou?r/i, value: '#000000' },
	// Mime
	{ pattern: /mime|content[-_]?type/i, value: 'application/json' },
	// Method
	{ pattern: /\bmethod\b/i, value: 'GET' },
	// Version
	{ pattern: /version/i, value: '1.0.0' },
	// Channel (Slack-like)
	{ pattern: /channel/i, value: 'general' },
];

const NUMBER_HEURISTICS: Array<{ pattern: RegExp; value: number }> = [
	{ pattern: /^id$|[-_]id$/i, value: 1001 },
	{ pattern: /count|total|size|length/i, value: 10 },
	{ pattern: /page|offset/i, value: 1 },
	{ pattern: /limit|per[-_]?page|page[-_]?size/i, value: 25 },
	{ pattern: /amount|price|total|cost/i, value: 100 },
	{ pattern: /age/i, value: 30 },
	{ pattern: /year/i, value: 2025 },
	{ pattern: /port/i, value: 8080 },
	{ pattern: /width|height/i, value: 100 },
	{ pattern: /index|position|order/i, value: 0 },
];

// =============================================================================
// Core Generator
// =============================================================================

/**
 * Generate a concrete sample value from a JSON Schema.
 *
 * Uses property-name heuristics for realistic values and
 * falls back to sensible type-based defaults.
 *
 * @param schema - The JSON Schema to generate sample data from
 * @param propertyName - Optional property name for heuristic matching
 * @returns A concrete sample value matching the schema
 */
export function jsonSchemaToSampleData(schema: JsonSchema, propertyName?: string): unknown {
	// Handle array of types (e.g., ["string", "null"])
	if (Array.isArray(schema.type)) {
		const nonNullType = schema.type.find((t) => t !== 'null');
		if (nonNullType) {
			return jsonSchemaToSampleData({ ...schema, type: nonNullType }, propertyName);
		}
		return null;
	}

	// Handle const — use the exact value
	if (schema.const !== undefined) {
		return schema.const;
	}

	// Handle enum — use the first value
	if (schema.enum && schema.enum.length > 0) {
		return schema.enum[0];
	}

	// Handle oneOf/anyOf — use the first variant
	if (schema.oneOf && schema.oneOf.length > 0) {
		return jsonSchemaToSampleData(schema.oneOf[0], propertyName);
	}
	if (schema.anyOf && schema.anyOf.length > 0) {
		return jsonSchemaToSampleData(schema.anyOf[0], propertyName);
	}

	// Handle allOf — merge all variants (shallow object merge)
	if (schema.allOf && schema.allOf.length > 0) {
		const merged: Record<string, unknown> = {};
		for (const variant of schema.allOf) {
			const value = jsonSchemaToSampleData(variant, propertyName);
			if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
				Object.assign(merged, value);
			}
		}
		return Object.keys(merged).length > 0
			? merged
			: jsonSchemaToSampleData(schema.allOf[0], propertyName);
	}

	// Handle type-specific generation
	switch (schema.type) {
		case 'string':
			return generateString(propertyName);
		case 'integer':
		case 'number':
			return generateNumber(propertyName);
		case 'boolean':
			return true;
		case 'null':
			return null;
		case 'array':
			if (schema.items) {
				return [jsonSchemaToSampleData(schema.items)];
			}
			return [];
		case 'object':
			return generateObject(schema);
		default:
			// No type specified — if there are properties, treat as object
			if (schema.properties) {
				return generateObject(schema);
			}
			return {};
	}
}

// =============================================================================
// Type-Specific Generators
// =============================================================================

function generateString(propertyName?: string): string {
	if (propertyName) {
		for (const { pattern, value } of STRING_HEURISTICS) {
			if (pattern.test(propertyName)) {
				return value;
			}
		}
	}
	return 'sample';
}

function generateNumber(propertyName?: string): number {
	if (propertyName) {
		for (const { pattern, value } of NUMBER_HEURISTICS) {
			if (pattern.test(propertyName)) {
				return value;
			}
		}
	}
	return 1;
}

function generateObject(schema: JsonSchema): Record<string, unknown> {
	const obj: Record<string, unknown> = {};
	if (schema.properties) {
		for (const [key, propSchema] of Object.entries(schema.properties)) {
			obj[key] = jsonSchemaToSampleData(propSchema, key);
		}
	}
	return obj;
}
