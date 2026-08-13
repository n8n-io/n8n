/**
 * Zod Schema Helpers for n8n Node Configuration Validation
 *
 * This file contains reusable Zod schemas for common n8n patterns.
 * These are used by generated schema files to validate node configurations at runtime.
 *
 * Key insight: Expression<T> is a TypeScript function type `($: ExpressionContext) => T`,
 * but at runtime expressions are serialized as strings starting with `={{`.
 * The Zod schemas validate this runtime representation.
 */

import { z } from 'zod';

// =============================================================================
// Expression Pattern
// =============================================================================

/**
 * Pattern for n8n expressions: strings starting with ={{
 * Examples: "={{ $json.field }}", "={{ $now }}", "={{ 1 + 1 }}"
 */
export const expressionPattern = /^={{.*}}$/s;

/**
 * Zod schema for an n8n expression string
 */
export const expressionSchema = z
	.string()
	.regex(expressionPattern, 'Must be an n8n expression (={{...}})');

// =============================================================================
// Primitive Type Schemas with Expression Support
// =============================================================================

/**
 * String value or n8n expression
 * At runtime, expressions are strings like "={{ $json.name }}"
 * Note: Since expressions are also strings, this is just z.string()
 */
export const stringOrExpression = z.string();

/**
 * Number value or n8n expression
 */
export const numberOrExpression = z.union([z.number(), expressionSchema]);

/**
 * Boolean value or n8n expression
 */
export const booleanOrExpression = z.union([z.boolean(), expressionSchema]);

// =============================================================================
// Complex Type Schemas
// =============================================================================

/**
 * Resource Locator Value schema (object format)
 * Used for nodes that look up resources by ID or URL
 */
const resourceLocatorObjectSchema = z.object({
	__rl: z.literal(true),
	mode: z.string(),
	value: z.union([z.string(), z.number()]),
	cachedResultName: z.string().optional(),
	cachedResultUrl: z.string().optional(),
});

/**
 * Resource Locator Value schema - accepts object format OR expression
 */
export const resourceLocatorValueSchema = z.union([resourceLocatorObjectSchema, expressionSchema]);

/**
 * Filter condition operator schema
 */
export const filterOperatorSchema = z.object({
	type: z.string(),
	operation: z.string(),
	singleValue: z.boolean().optional(),
});

/**
 * Filter condition schema
 */
export const filterConditionSchema = z.object({
	id: z.string().optional(),
	leftValue: z.unknown(),
	operator: filterOperatorSchema,
	rightValue: z.unknown().optional(),
});

/**
 * Filter Value schema
 * Used for filter nodes that evaluate conditions
 */
export const filterValueSchema = z.object({
	conditions: z.array(filterConditionSchema),
	combinator: z.enum(['and', 'or']).optional(),
});

/**
 * Assignment schema (single field assignment)
 */
export const assignmentSchema = z.object({
	id: z.string(),
	name: z.string(),
	value: z.unknown(),
	type: z.string().optional(),
});

/**
 * Assignment Collection Value schema
 * Used for nodes that assign multiple values
 */
export const assignmentCollectionValueSchema = z.object({
	assignments: z.array(assignmentSchema),
});

/**
 * IDataObject schema - generic data object
 * Allows nested objects and arrays with common JSON types
 */
export const iDataObjectSchema: z.ZodType<Record<string, unknown>> = z.record(
	z.string(),
	z.unknown(),
);

// =============================================================================
// Helper Functions for Schema Generation
// =============================================================================

/**
 * Create a literal union schema from an array of values
 * @param values Array of literal values (at least 2 required for union)
 * @returns Zod union of literals
 */
export function literalUnion<T extends string | number | boolean>(values: T[]): z.ZodType<T> {
	if (values.length === 0) {
		throw new Error('literalUnion requires at least one value');
	}
	if (values.length === 1) {
		return z.literal(values[0]);
	}
	const [first, second, ...rest] = values.map((v) => z.literal(v));
	return z.union([first, second, ...rest]);
}

/**
 * Create a schema for options with expression support
 * @param values Array of option values
 * @returns Zod union of literals and expression
 */
export function optionsWithExpression<T extends string | number | boolean>(
	values: T[],
): z.ZodType<T | string> {
	if (values.length === 0) {
		return stringOrExpression;
	}
	const literalSchemas = values.map((v) => z.literal(v));
	// At least one literal + expression = at least 2 elements for union
	const [first, ...rest] = literalSchemas;
	return z.union([first, expressionSchema, ...rest]);
}

/**
 * Create a schema for multi-options (array of values)
 * @param values Array of allowed option values
 * @returns Zod array schema
 */
export function multiOptionsSchema<T extends string | number | boolean>(
	values: T[],
): z.ZodArray<z.ZodTypeAny> {
	if (values.length === 0) {
		return z.array(z.string());
	}
	if (values.length === 1) {
		return z.array(z.literal(values[0]));
	}
	const [first, second, ...rest] = values.map((v) => z.literal(v));
	return z.array(z.union([first, second, ...rest]));
}
