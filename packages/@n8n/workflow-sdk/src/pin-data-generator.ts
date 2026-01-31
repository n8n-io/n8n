/**
 * Pin Data Generator
 * Generates mock data from JSON schemas using minifaker
 */

import { setSeed, hex, email, boolean, number, domainUrl } from 'minifaker';
import 'minifaker/locales/en';
import type { IDataObject } from './types/base';

/**
 * Generates a seeded UUID v4-like string using minifaker's hex function
 * This ensures reproducibility when a seed is set
 */
function generateSeededUuid(): string {
	// Generate UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
	// where y is 8, 9, a, or b
	// hex(n) returns "0x" + n hex digits, so we need to strip the prefix
	const stripHex = (h: string) => h.slice(2); // Remove "0x" prefix

	const part1 = stripHex(hex(8)); // 8 hex chars
	const part2 = stripHex(hex(4)); // 4 hex chars
	const part3 = '4' + stripHex(hex(3)); // Version 4 + 3 hex chars
	const variant = ['8', '9', 'a', 'b'][number({ min: 0, max: 3, float: false })];
	const part4 = variant + stripHex(hex(3)); // Variant + 3 hex chars
	const part5 = stripHex(hex(12)); // 12 hex chars

	return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

export interface JsonSchema {
	type?: string;
	properties?: Record<string, JsonSchema>;
	items?: JsonSchema;
	format?: string;
	enum?: unknown[];
	required?: string[];
	additionalProperties?: boolean | JsonSchema;
	[key: string]: unknown; // Allow arbitrary test properties
}

export interface GenerateOptions {
	seed?: number;
}

// Re-export IDataObject for consumers
export type { IDataObject };

/**
 * Generates mock data from a JSON schema
 * @param schema - The JSON schema to generate data from
 * @param itemCount - Number of items to generate
 * @param options - Generation options including optional seed
 * @returns Array of generated data objects
 */
export function generateFromSchema(
	schema: JsonSchema,
	itemCount: number,
	options?: GenerateOptions,
): IDataObject[] {
	// Set seed at the beginning of generation for reproducibility
	// setSeed must be called before any minifaker functions to ensure deterministic output
	if (options?.seed !== undefined) {
		setSeed(String(options.seed));
	}

	const items: IDataObject[] = [];

	for (let i = 0; i < itemCount; i++) {
		items.push(generateValue(schema, undefined, options) as IDataObject);
	}

	return items;
}

function generateValue(
	schema: JsonSchema,
	propertyName?: string,
	options?: GenerateOptions,
): unknown {
	// Handle enum first - takes precedence over type
	if (schema.enum && schema.enum.length > 0) {
		// Use minifaker's number function for seeded randomness
		const index = number({ min: 0, max: schema.enum.length - 1, float: false });
		return schema.enum[index];
	}

	switch (schema.type) {
		case 'string':
			return generateString(schema.format, propertyName);
		case 'number':
			return number({ min: 1, max: 1000, float: true });
		case 'integer':
			return number({ min: 1, max: 1000, float: false });
		case 'boolean':
			return boolean();
		case 'array':
			return generateArray(schema, options);
		case 'object':
			return generateObject(schema, options);
		default:
			return null;
	}
}

function isIdField(propertyName?: string): boolean {
	if (!propertyName) return false;
	return propertyName === 'id' || propertyName.endsWith('Id') || propertyName.endsWith('_id');
}

function generateString(format?: string, propertyName?: string): string {
	// ID fields always get UUIDs
	if (isIdField(propertyName)) {
		return generateSeededUuid();
	}

	switch (format) {
		case 'email':
			return email();
		case 'uri':
		case 'url':
			return domainUrl();
		case 'uuid':
			return generateSeededUuid();
		case 'date-time':
			return new Date().toISOString();
		default:
			// Default to UUID for generic strings (unique identifier)
			return generateSeededUuid();
	}
}

function generateObject(schema: JsonSchema, options?: GenerateOptions): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	if (!schema.properties) {
		return result;
	}

	for (const [key, propSchema] of Object.entries(schema.properties)) {
		result[key] = generateValue(propSchema, key, options);
	}

	return result;
}

function generateArray(schema: JsonSchema, options?: GenerateOptions): unknown[] {
	if (!schema.items) {
		return [];
	}

	// Generate 1 item for arrays by default
	return [generateValue(schema.items, undefined, options)];
}
