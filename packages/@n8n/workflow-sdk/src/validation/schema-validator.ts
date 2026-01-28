/**
 * Schema Validator
 *
 * Dynamically loads and applies Zod schemas for node configuration validation.
 * Uses generated schemas from ~/.n8n/generated-types/ by default.
 */

import type { ZodSchema, ZodIssue } from 'zod';
import * as os from 'os';
import * as path from 'path';

// Import resolveSchema for factory function support
import { resolveSchema } from './resolve-schema';

// Default path to generated schemas
const DEFAULT_SCHEMA_BASE_PATH = path.join(os.homedir(), '.n8n', 'generated-types');
let schemaBasePath = DEFAULT_SCHEMA_BASE_PATH;

// Cache for loaded schemas (either ZodSchema or factory function)
type SchemaOrFactory =
	| ZodSchema
	| ((args: {
			parameters: Record<string, unknown>;
			resolveSchema: typeof resolveSchema;
	  }) => ZodSchema);
const schemaCache = new Map<string, SchemaOrFactory | null>();

/**
 * Validation result from schema validation
 */
export interface SchemaValidationResult {
	valid: boolean;
	errors: Array<{
		path: string;
		message: string;
	}>;
}

/**
 * Get the current schema base path
 */
export function getSchemaBasePath(): string {
	return schemaBasePath;
}

/**
 * Set a custom schema base path (useful for testing)
 */
export function setSchemaBasePath(basePath: string): void {
	schemaBasePath = basePath;
	// Clear cache when base path changes
	schemaCache.clear();
}

/**
 * Convert node type to schema file path components
 *
 * Examples:
 * - "n8n-nodes-base.httpRequest" -> { pkg: "n8n-nodes-base", nodeName: "httpRequest" }
 * - "@n8n/n8n-nodes-langchain.agent" -> { pkg: "n8n-nodes-langchain", nodeName: "agent" }
 */
function nodeTypeToPathComponents(nodeType: string): { pkg: string; nodeName: string } {
	// Handle @n8n/ prefix for langchain nodes
	const normalized = nodeType.replace(/^@n8n\//, '');
	const [pkg, ...rest] = normalized.split('.');
	const nodeName = rest.join('.'); // Handle multi-part names (shouldn't happen, but be safe)
	return { pkg, nodeName };
}

/**
 * Convert version number to version string for file path
 *
 * Examples:
 * - 1 -> "v1"
 * - 4.2 -> "v42"
 * - 1.7 -> "v17"
 */
function versionToString(version: number): string {
	// Remove decimal point: 4.2 -> "42", 1.7 -> "17"
	const versionStr = String(version).replace('.', '');
	return `v${versionStr}`;
}

/**
 * Build the expected ConfigSchema export name for a node
 *
 * Schema naming conventions:
 * - n8n-nodes-base.set v2 -> SetV2ConfigSchema
 * - n8n-nodes-langchain.agent v1 -> LcAgentV1ConfigSchema (Lc prefix for langchain)
 * - n8n-nodes-base.httpRequest v4.2 -> HttpRequestV42ConfigSchema
 *
 * @param nodeName - Node name from node type (e.g., "set", "agent", "httpRequest")
 * @param versionStr - Version string (e.g., "v2", "v42")
 * @param isLangchain - Whether this is a langchain node
 * @returns Expected schema export name
 */
function buildExpectedSchemaName(
	nodeName: string,
	versionStr: string,
	isLangchain: boolean,
): string {
	// Convert first letter to uppercase for PascalCase
	const pascalName = nodeName.charAt(0).toUpperCase() + nodeName.slice(1);
	// Convert versionStr to PascalCase: "v2" -> "V2", "v42" -> "V42"
	const pascalVersion = versionStr.charAt(0).toUpperCase() + versionStr.slice(1);
	// Add Lc prefix for langchain nodes
	const prefix = isLangchain ? 'Lc' : '';
	return `${prefix}${pascalName}${pascalVersion}ConfigSchema`;
}

/**
 * Build the expected factory function name for a node
 *
 * Factory naming conventions (for nodes with displayOptions):
 * - n8n-nodes-base.set v2 -> getSetV2ConfigSchema
 * - n8n-nodes-langchain.agent v1 -> getLcAgentV1ConfigSchema (Lc prefix for langchain)
 *
 * @param nodeName - Node name from node type
 * @param versionStr - Version string (e.g., "v2", "v42")
 * @param isLangchain - Whether this is a langchain node
 * @returns Expected factory function name
 */
function buildExpectedFactoryName(
	nodeName: string,
	versionStr: string,
	isLangchain: boolean,
): string {
	// Convert first letter to uppercase for PascalCase
	const pascalName = nodeName.charAt(0).toUpperCase() + nodeName.slice(1);
	// Convert versionStr to PascalCase: "v2" -> "V2", "v42" -> "V42"
	const pascalVersion = versionStr.charAt(0).toUpperCase() + versionStr.slice(1);
	// Add Lc prefix for langchain nodes
	const prefix = isLangchain ? 'Lc' : '';
	return `get${prefix}${pascalName}${pascalVersion}ConfigSchema`;
}

/**
 * Load and cache schema for a node type/version
 *
 * Supports both:
 * - Static schemas: ConfigSchema exports (ZodSchema)
 * - Factory functions: getConfigSchema exports (for nodes with displayOptions)
 *
 * @param nodeType - Full node type string (e.g., "n8n-nodes-base.set", "@n8n/n8n-nodes-langchain.agent")
 * @param version - Node version (e.g., 2, 4.2, 1.7)
 * @returns ZodSchema or factory function if found, null otherwise
 */
export function loadSchema(nodeType: string, version: number): SchemaOrFactory | null {
	const cacheKey = `${nodeType}@${version}`;

	// Check cache first
	if (schemaCache.has(cacheKey)) {
		return schemaCache.get(cacheKey) ?? null;
	}

	const { pkg, nodeName } = nodeTypeToPathComponents(nodeType);
	const versionStr = versionToString(version);
	const isLangchain = pkg === 'n8n-nodes-langchain';

	// Schema file path: nodes/{pkg}/{nodeName}/{version}.schema.ts
	const schemaPath = path.join(schemaBasePath, 'nodes', pkg, nodeName, `${versionStr}.schema`);

	try {
		// Dynamic require to load the schema module
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const schemaModule = require(schemaPath);

		// Build the expected names to find the right export
		const expectedSchemaName = buildExpectedSchemaName(nodeName, versionStr, isLangchain);
		const expectedFactoryName = buildExpectedFactoryName(nodeName, versionStr, isLangchain);

		// Try exact match for static schema first
		if (schemaModule[expectedSchemaName]) {
			const schema = schemaModule[expectedSchemaName] as ZodSchema;
			schemaCache.set(cacheKey, schema);
			return schema;
		}

		// Try exact match for factory function
		if (typeof schemaModule[expectedFactoryName] === 'function') {
			const factory = schemaModule[expectedFactoryName] as SchemaOrFactory;
			schemaCache.set(cacheKey, factory);
			return factory;
		}

		// Fallback: find any export ending with ConfigSchema but NOT SubnodeConfigSchema
		const schemaName = Object.keys(schemaModule).find(
			(k) => k.endsWith('ConfigSchema') && !k.includes('Subnode'),
		);

		if (schemaName && schemaModule[schemaName]) {
			const schema = schemaModule[schemaName] as ZodSchema;
			schemaCache.set(cacheKey, schema);
			return schema;
		}

		// Fallback: find any factory function (starts with 'get', ends with 'ConfigSchema')
		const factoryName = Object.keys(schemaModule).find(
			(k) =>
				k.startsWith('get') &&
				k.endsWith('ConfigSchema') &&
				!k.includes('Subnode') &&
				typeof schemaModule[k] === 'function',
		);

		if (factoryName && schemaModule[factoryName]) {
			const factory = schemaModule[factoryName] as SchemaOrFactory;
			schemaCache.set(cacheKey, factory);
			return factory;
		}

		// No ConfigSchema found
		schemaCache.set(cacheKey, null);
		return null;
	} catch {
		// Schema file not found or failed to load - graceful fallback
		schemaCache.set(cacheKey, null);
		return null;
	}
}

/**
 * Format a single Zod issue into a clear, actionable error message
 */
function formatZodIssue(issue: ZodIssue): string {
	const path = issue.path.join('.');

	switch (issue.code) {
		case 'invalid_type':
			if (issue.received === 'undefined') {
				return `Required field "${path}" is missing. Expected ${issue.expected}.`;
			}
			return `Field "${path}" has wrong type. Expected ${issue.expected}, but got ${issue.received}.`;

		case 'invalid_union':
			// For union errors, try to extract meaningful info from nested errors
			if ('unionErrors' in issue && Array.isArray(issue.unionErrors)) {
				// Check if all union errors are about undefined/missing value
				const allMissing = issue.unionErrors.every((ue) =>
					ue.issues.some(
						(i) =>
							i.code === 'invalid_type' && (i as { received?: string }).received === 'undefined',
					),
				);
				if (allMissing) {
					return `Required field "${path}" is missing.`;
				}
			}
			return `Field "${path}" has invalid value. None of the expected types matched.`;

		case 'invalid_literal':
			return `Field "${path}" must be exactly "${issue.expected}", but got "${(issue as { received?: unknown }).received}".`;

		case 'invalid_enum_value':
			if ('options' in issue && Array.isArray(issue.options)) {
				return `Field "${path}" must be one of: ${issue.options.map((o) => `"${o}"`).join(', ')}.`;
			}
			return `Field "${path}" has invalid enum value.`;

		case 'too_small':
			if ('type' in issue) {
				if (issue.type === 'string') {
					return `Field "${path}" is too short. Minimum length is ${(issue as { minimum?: number }).minimum}.`;
				}
				if (issue.type === 'array') {
					return `Field "${path}" must have at least ${(issue as { minimum?: number }).minimum} item(s).`;
				}
			}
			return `Field "${path}" is too small.`;

		case 'too_big':
			if ('type' in issue) {
				if (issue.type === 'string') {
					return `Field "${path}" is too long. Maximum length is ${(issue as { maximum?: number }).maximum}.`;
				}
				if (issue.type === 'array') {
					return `Field "${path}" must have at most ${(issue as { maximum?: number }).maximum} item(s).`;
				}
			}
			return `Field "${path}" is too large.`;

		case 'unrecognized_keys':
			if ('keys' in issue && Array.isArray(issue.keys)) {
				return `Unknown field(s) at "${path}": ${issue.keys.map((k) => `"${k}"`).join(', ')}.`;
			}
			return `Unknown fields at "${path}".`;

		default:
			// Fallback to Zod's default message with path context
			return `Field "${path}": ${issue.message}`;
	}
}

/**
 * Convert Zod issues to our error format with clear, actionable messages
 */
function formatZodErrors(issues: ZodIssue[]): Array<{ path: string; message: string }> {
	return issues.map((issue) => ({
		path: issue.path.join('.'),
		message: formatZodIssue(issue),
	}));
}

/**
 * Check if a value is a Zod schema (has safeParse method)
 */
function isZodSchema(value: SchemaOrFactory): value is ZodSchema {
	return typeof value === 'object' && value !== null && 'safeParse' in value;
}

/**
 * Validate node config against its Zod schema
 *
 * Supports both static schemas and factory functions.
 * For factory functions, calls them with the node's parameters to get
 * a context-aware schema that respects displayOptions conditions.
 *
 * @param nodeType - Full node type string
 * @param version - Node version
 * @param config - Node configuration (parameters, subnodes, etc.)
 * @returns Validation result with errors if invalid
 */
export function validateNodeConfig(
	nodeType: string,
	version: number,
	config: { parameters?: unknown; subnodes?: unknown },
): SchemaValidationResult {
	const schemaOrFactory = loadSchema(nodeType, version);

	if (!schemaOrFactory) {
		// No schema available - skip validation (graceful fallback)
		return { valid: true, errors: [] };
	}

	// Determine if this is a static schema or factory function
	let schema: ZodSchema;
	if (isZodSchema(schemaOrFactory)) {
		// Static schema - use directly
		schema = schemaOrFactory;
	} else {
		// Factory function - call it with parameters to get the schema
		const parameters = (config.parameters ?? {}) as Record<string, unknown>;
		schema = schemaOrFactory({ parameters, resolveSchema });
	}

	const result = schema.safeParse(config);

	if (result.success) {
		return { valid: true, errors: [] };
	}

	return {
		valid: false,
		errors: formatZodErrors(result.error.issues),
	};
}
