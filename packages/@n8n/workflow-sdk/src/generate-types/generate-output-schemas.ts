/**
 * Generate Output Schemas
 * Generates .output.ts files with output schemas for pin data generation
 */

import type { JsonSchema, OutputSchema } from './generate-types';

// Re-export for external consumers
export type { OutputSchema };

/**
 * Entry in the output schemas array for the generated file
 */
export interface OutputSchemaEntry {
	parameters?: Record<string, string>;
	schema?: JsonSchema;
	schemas?: OutputSchemaEntry[];
}

/**
 * Groups flat output schemas into a nested structure based on discriminators (resource/operation)
 *
 * Input: [{ resource: 'user', operation: 'get', schema: {...} }, ...]
 * Output: [{ parameters: { resource: 'user' }, schemas: [{ parameters: { operation: 'get' }, schema: {...} }] }]
 *
 * @param schemas - Flat array of output schemas
 * @returns Nested array of output schema entries
 */
export function groupSchemasByDiscriminators(schemas: OutputSchema[]): OutputSchemaEntry[] {
	// Handle empty schemas
	if (schemas.length === 0) {
		return [];
	}

	// Check if all schemas have empty resource and operation (simple node)
	const isSimpleNode = schemas.every((s) => !s.resource && !s.operation);
	if (isSimpleNode) {
		// Return simple structure without nesting
		return schemas.map((s) => ({ schema: s.schema }));
	}

	// Check if all schemas have empty resource (operation-only node)
	const hasNoResources = schemas.every((s) => !s.resource);
	if (hasNoResources) {
		// Return operation-level nesting only
		return schemas.map((s) => ({
			parameters: s.operation ? { operation: s.operation } : undefined,
			schema: s.schema,
		}));
	}

	// Group by resource
	const byResource = new Map<string, OutputSchema[]>();
	for (const schema of schemas) {
		const resource = schema.resource || '';
		const existing = byResource.get(resource) ?? [];
		existing.push(schema);
		byResource.set(resource, existing);
	}

	// Convert to nested structure
	const result: OutputSchemaEntry[] = [];

	for (const [resource, resourceSchemas] of byResource) {
		if (!resource) {
			// Schemas without resource go directly
			for (const s of resourceSchemas) {
				result.push({ schema: s.schema });
			}
			continue;
		}

		const entry: OutputSchemaEntry = {
			parameters: { resource },
			schemas: resourceSchemas.map((s) => ({
				parameters: s.operation ? { operation: s.operation } : undefined,
				schema: s.schema,
			})),
		};
		result.push(entry);
	}

	return result;
}

/**
 * Generates the TypeScript content for an output schema file
 *
 * @param nodeName - Name of the node (e.g., 'Slack')
 * @param version - Version number
 * @param schemas - Array of discovered output schemas
 * @returns TypeScript file content
 */
export function generateOutputSchemaContent(
	nodeName: string,
	version: number,
	schemas: OutputSchema[],
): string {
	const lines: string[] = [];

	// Header with JSDoc
	lines.push('/**');
	lines.push(` * ${nodeName} - Version ${version} - Output Schemas`);
	lines.push(' * Used for generating pin data');
	lines.push(' *');
	lines.push(' * @generated This file is auto-generated. Do not edit manually.');
	lines.push(' */');
	lines.push('');

	// Handle empty schemas
	if (schemas.length === 0) {
		lines.push('export const outputSchemas = [] as const;');
		lines.push('');
		return lines.join('\n');
	}

	// Group schemas
	const grouped = groupSchemasByDiscriminators(schemas);

	// Generate export
	lines.push('export const outputSchemas = ');
	lines.push(formatOutputSchemas(grouped, 0));
	lines.push(' as const;');
	lines.push('');

	return lines.join('\n');
}

/**
 * Formats the output schemas array as a TypeScript literal
 */
function formatOutputSchemas(entries: OutputSchemaEntry[], indent: number): string {
	const spaces = '  '.repeat(indent);
	const innerSpaces = '  '.repeat(indent + 1);

	if (entries.length === 0) {
		return '[]';
	}

	const lines: string[] = ['['];

	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		const entryLines = formatEntry(entry, indent + 1);
		const comma = i < entries.length - 1 ? ',' : '';
		lines.push(`${innerSpaces}${entryLines}${comma}`);
	}

	lines.push(`${spaces}]`);
	return lines.join('\n');
}

/**
 * Formats a single output schema entry
 */
function formatEntry(entry: OutputSchemaEntry, indent: number): string {
	const spaces = '  '.repeat(indent);
	const innerSpaces = '  '.repeat(indent + 1);

	const parts: string[] = ['{'];

	// Add parameters if present
	if (entry.parameters) {
		const paramStr = Object.entries(entry.parameters)
			.map(([k, v]) => `${k}: '${v}'`)
			.join(', ');
		parts.push(`\n${innerSpaces}parameters: { ${paramStr} },`);
	}

	// Add nested schemas if present
	if (entry.schemas && entry.schemas.length > 0) {
		parts.push(`\n${innerSpaces}schemas: ${formatOutputSchemas(entry.schemas, indent + 1)},`);
	}

	// Add schema if present (leaf node)
	if (entry.schema) {
		parts.push(
			`\n${innerSpaces}schema: ${JSON.stringify(entry.schema, null, 2)
				.split('\n')
				.map((line, i) => (i === 0 ? line : `${innerSpaces}${line}`))
				.join('\n')},`,
		);
	}

	parts.push(`\n${spaces}}`);
	return parts.join('');
}

/**
 * Generates the JSON content for an output schema file (for runtime loading)
 *
 * @param schemas - Array of discovered output schemas
 * @returns JSON string of grouped output schemas
 */
export function generateOutputSchemaJson(schemas: OutputSchema[]): string {
	const grouped = groupSchemasByDiscriminators(schemas);
	return JSON.stringify(grouped, null, 2);
}
