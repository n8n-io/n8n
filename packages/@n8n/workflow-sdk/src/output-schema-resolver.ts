/**
 * Output Schema Resolver
 * Matches and resolves output schemas based on node parameters
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { JsonSchema } from './pin-data-generator';

/**
 * Path to the generated types directory
 */
const GENERATED_TYPES_PATH = path.join(os.homedir(), '.n8n', 'generated-types');

/**
 * Entry in the output schemas array
 * Can have parameters for filtering, a direct schema, and/or nested schemas
 */
export interface OutputSchemaEntry {
	parameters?: Record<string, unknown>;
	schema?: JsonSchema;
	schemas?: OutputSchemaEntry[];
}

/**
 * Matches output schemas against node parameters using depth-first search
 * Returns the first matching schema found
 *
 * @param schemas - Array of output schema entries to search
 * @param params - Node parameters to match against
 * @returns The matching JSON schema or undefined if no match
 */
export function matchSchema(
	schemas: OutputSchemaEntry[],
	params: Record<string, unknown>,
): JsonSchema | undefined {
	for (const entry of schemas) {
		// Check if this entry's parameters match the input params
		if (!parametersMatch(entry.parameters, params)) {
			continue;
		}

		// If entry has nested schemas, try to match those first (depth-first)
		if (entry.schemas && entry.schemas.length > 0) {
			const nestedResult = matchSchema(entry.schemas, params);
			if (nestedResult) {
				return nestedResult;
			}
		}

		// If no nested match but entry has a direct schema, return it
		if (entry.schema) {
			return entry.schema;
		}
	}

	return undefined;
}

/**
 * Checks if schema parameters match the input parameters
 * All schema parameters must match, but input can have extra parameters
 *
 * @param schemaParams - Parameters defined in the schema entry (can be undefined)
 * @param inputParams - Parameters from the node
 * @returns true if all schema parameters match
 */
function parametersMatch(
	schemaParams: Record<string, unknown> | undefined,
	inputParams: Record<string, unknown>,
): boolean {
	// No parameters means it matches everything
	if (!schemaParams) {
		return true;
	}

	// All schema parameters must match the input
	return Object.entries(schemaParams).every(([key, value]) => inputParams[key] === value);
}

/**
 * Cache for loaded output schemas
 */
const schemaCache = new Map<string, OutputSchemaEntry[] | undefined>();

/**
 * Loads output schemas for a node type and version
 * Returns undefined if no schemas are found
 *
 * @param nodeType - The node type (e.g., 'n8n-nodes-base.slack')
 * @param version - The node version (number or string like "2" or "2.1")
 * @returns Array of output schema entries or undefined
 */
export function loadOutputSchemas(
	nodeType: string,
	version: number | string,
): OutputSchemaEntry[] | undefined {
	const cacheKey = `${nodeType}:${version}`;

	if (schemaCache.has(cacheKey)) {
		return schemaCache.get(cacheKey);
	}

	// Try to load the output schema file
	// Output schemas are expected to be at ~/.n8n/generated-types/nodes/{package}/{nodeName}/v{version}.output.ts
	// For now, we'll return undefined and implement the actual loading later
	// when the generate-output-schemas step is complete
	const schemas = tryLoadOutputSchemas(nodeType, version);
	schemaCache.set(cacheKey, schemas);

	return schemas;
}

/**
 * Converts a version number to a file name prefix
 * Matches the format used in generate-types.ts
 */
function versionToFileName(version: number | string): string {
	const versionNum = typeof version === 'string' ? parseFloat(version) : version;
	// Convert version like 3.1 to v31, 3 to v3
	if (Number.isInteger(versionNum)) {
		return `v${versionNum}`;
	}
	return `v${String(versionNum).replace('.', '')}`;
}

/**
 * Attempts to load output schemas from the generated types directory
 */
function tryLoadOutputSchemas(
	nodeType: string,
	version: number | string,
): OutputSchemaEntry[] | undefined {
	// Parse the node type to get package and node name
	// e.g., 'n8n-nodes-base.slack' → package: 'n8n-nodes-base', node: 'slack'
	const parts = nodeType.split('.');
	if (parts.length < 2) {
		return undefined;
	}

	const packageName = parts[0];
	const nodeName = parts.slice(1).join('.');

	// Build path to the JSON output file
	// e.g., ~/.n8n/generated-types/nodes/n8n-nodes-base/slack/v2.output.json
	const fileName = versionToFileName(version);
	const jsonFilePath = path.join(
		GENERATED_TYPES_PATH,
		'nodes',
		packageName,
		nodeName.toLowerCase(),
		`${fileName}.output.json`,
	);

	// Try to load the JSON file
	try {
		if (!fs.existsSync(jsonFilePath)) {
			return undefined;
		}

		const content = fs.readFileSync(jsonFilePath, 'utf-8');
		const schemas = JSON.parse(content) as OutputSchemaEntry[];
		return schemas;
	} catch {
		// File doesn't exist or is invalid JSON
		return undefined;
	}
}

/**
 * Clears the schema cache (useful for testing)
 */
export function clearSchemaCache(): void {
	schemaCache.clear();
}
