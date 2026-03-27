/**
 * Type Generation Script
 *
 * Generates TypeScript types from n8n node definitions.
 *
 * This script reads node definitions from:
 * - packages/nodes-base/dist/types/nodes.json
 * - packages/@n8n/nodes-langchain/dist/types/nodes.json
 *
 * And generates typed interfaces with JSDoc documentation.
 *
 * Usage:
 *   pnpm generate-types
 *
 * Output:
 *   dist/node-definitions/ (within each node package)
 *
 * @generated - This file generates code, but is itself manually maintained.
 */

import * as fs from 'fs';
import { deepCopy } from 'n8n-workflow';
import * as path from 'path';

// eslint-disable-next-line import-x/no-cycle -- TODO: Refactor shared types/utils to break cycle
import {
	generateSingleVersionSchemaFile,
	planSplitVersionSchemaFiles,
} from './generate-zod-schemas';
import { checkConditions } from '../validation/display-options';

// =============================================================================
// Configuration
// =============================================================================

/** Indentation string for generated code (2 spaces per level) */
const INDENT = '  ';

const NODES_BASE_TYPES = path.resolve(__dirname, '../../../../nodes-base/dist/types/nodes.json');
const NODES_LANGCHAIN_TYPES = path.resolve(
	__dirname,
	'../../../nodes-langchain/dist/types/nodes.json',
);
/** Dev script output path (local to the package) */
const DEV_OUTPUT_PATH = path.resolve(__dirname, '../../dist/node-definitions');

// Path to nodes-base dist for finding output schemas
const NODES_BASE_DIST = path.resolve(__dirname, '../../../../nodes-base/dist/nodes');

// Discriminator fields that create operation-specific parameter sets
// Only fields that truly benefit from splitting the type are included here
// Other fields like authentication, trigger, agent, promptType are treated as regular properties
const DISCRIMINATOR_FIELDS = ['resource', 'operation', 'mode'];

/** Custom API Call operations don't have fixed schemas - skip them */
const CUSTOM_API_CALL_KEY = '__CUSTOM_API_CALL__';

const ASSIGNMENT_TYPE_JSDOC = `/**
 * Assignment type determines how the value is interpreted.
 * - string: Direct string value or expression evaluating to string
 * - number: Direct number value or expression evaluating to number
 * - boolean: Direct boolean value or expression evaluating to boolean
 * - array: Expression that evaluates to an array, e.g. ={{ [1, 2, 3] }} or ={{ $json.items }}
 * - object: Expression that evaluates to a plain object (not an array — use the array type for arrays), e.g. ={{ { key: 'value' } }} or ={{ $json.data }}
 * - binary: Property name of binary data in the input item, or expression to access binary data from previous nodes, e.g. ={{ $('Node').item.binary.data }}
 */`;

function generateFilterTypeDeclaration(exported: boolean): string {
	const prefix = exported ? 'export type' : 'type';
	return `${prefix} FilterValue = { conditions: Array<{ leftValue: unknown; operator: { type: string; operation: string }; rightValue: unknown }> };`;
}

function generateAssignmentTypeDeclarations(exported: boolean): string {
	const prefix = exported ? 'export type' : 'type';
	return `${ASSIGNMENT_TYPE_JSDOC}
${prefix} AssignmentType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'binary';
${prefix} AssignmentCollectionValue = { assignments: Array<{ id: string; name: string; value: unknown; type: AssignmentType }> };`;
}

function isCustomApiCall(operation: string): boolean {
	return operation === CUSTOM_API_CALL_KEY;
}

// TypeScript reserved words that need quoting
const RESERVED_WORDS = new Set([
	'break',
	'case',
	'catch',
	'class',
	'const',
	'continue',
	'debugger',
	'default',
	'delete',
	'do',
	'else',
	'enum',
	'export',
	'extends',
	'false',
	'finally',
	'for',
	'function',
	'if',
	'import',
	'in',
	'instanceof',
	'new',
	'null',
	'return',
	'super',
	'switch',
	'this',
	'throw',
	'true',
	'try',
	'typeof',
	'var',
	'void',
	'while',
	'with',
	'yield',
]);

/**
 * Known values for genericAuthType in HTTP Request node
 * Extracted from HttpRequestV3.node.ts execute() method
 */
const GENERIC_AUTH_TYPE_VALUES = [
	'httpBasicAuth',
	'httpBearerAuth',
	'httpDigestAuth',
	'httpHeaderAuth',
	'httpQueryAuth',
	'httpCustomAuth',
	'oAuth1Api',
	'oAuth2Api',
] as const;

/**
 * Mapping from AI input types to their corresponding subnode config field info
 */
const AI_TYPE_TO_SUBNODE_FIELD: Record<
	string,
	{
		fieldName: string;
		instanceType: string;
		isArray: boolean;
		canBeMultiple: boolean; // Whether it can be single or array (like model)
	}
> = {
	ai_languageModel: {
		fieldName: 'model',
		instanceType: 'LanguageModelInstance',
		isArray: false,
		canBeMultiple: true,
	},
	ai_memory: {
		fieldName: 'memory',
		instanceType: 'MemoryInstance',
		isArray: false,
		canBeMultiple: false,
	},
	ai_tool: {
		fieldName: 'tools',
		instanceType: 'ToolInstance',
		isArray: true,
		canBeMultiple: false,
	},
	ai_outputParser: {
		fieldName: 'outputParser',
		instanceType: 'OutputParserInstance',
		isArray: false,
		canBeMultiple: false,
	},
	ai_embedding: {
		fieldName: 'embedding',
		instanceType: 'EmbeddingInstance',
		isArray: false,
		canBeMultiple: true,
	},
	ai_vectorStore: {
		fieldName: 'vectorStore',
		instanceType: 'VectorStoreInstance',
		isArray: false,
		canBeMultiple: false,
	},
	ai_retriever: {
		fieldName: 'retriever',
		instanceType: 'RetrieverInstance',
		isArray: false,
		canBeMultiple: false,
	},
	ai_document: {
		fieldName: 'documentLoader',
		instanceType: 'DocumentLoaderInstance',
		isArray: false,
		canBeMultiple: true,
	},
	ai_textSplitter: {
		fieldName: 'textSplitter',
		instanceType: 'TextSplitterInstance',
		isArray: false,
		canBeMultiple: false,
	},
	ai_reranker: {
		fieldName: 'reranker',
		instanceType: 'RerankerInstance',
		isArray: false,
		canBeMultiple: false,
	},
};

// =============================================================================
// Type Definitions
// =============================================================================

export interface ParameterBuilderHint {
	message: string;
	placeholderSupported?: boolean;
}

export interface NodeProperty {
	name: string;
	displayName: string;
	type: string;
	description?: string;
	hint?: string;
	builderHint?: ParameterBuilderHint;
	default?: unknown;
	required?: boolean;
	options?: Array<{
		name: string;
		value?: string | number | boolean;
		description?: string;
		displayName?: string;
		builderHint?: ParameterBuilderHint;
		values?: NodeProperty[];
	}>;
	displayOptions?: {
		show?: Record<string, unknown[]>;
		hide?: Record<string, unknown[]>;
	};
	typeOptions?: Record<string, unknown>;
	noDataExpression?: boolean;
	modes?: Array<{
		name: string;
		displayName?: string;
		type?: string;
	}>;
}

export interface NodeTypeDescription {
	name: string;
	displayName: string;
	description?: string;
	group: string[];
	version: number | number[];
	defaultVersion?: number;
	properties: NodeProperty[];
	credentials?: Array<{ name: string; required?: boolean }>;
	inputs: string[] | Array<{ type: string; displayName?: string }>;
	outputs: string[] | Array<{ type: string; displayName?: string }>;
	subtitle?: string;
	usableAsTool?: boolean;
	hidden?: boolean;
	documentationUrl?: string;
	/** Path to schema directory relative to nodes-base/dist/nodes/ (e.g., "Google/Drive") */
	schemaPath?: string;
}

export interface DiscriminatorCombination {
	resource?: string;
	operation?: string;
	mode?: string;
	authentication?: string;
	trigger?: string;
	[key: string]: string | undefined;
}

export interface VersionGroup {
	versions: number[];
	highestVersion: number;
	properties: NodeProperty[];
}

/**
 * Represents an output schema discovered from the __schema__ directory
 */
export interface OutputSchema {
	resource: string;
	operation: string;
	schema: JsonSchema;
}

/**
 * JSON Schema type definitions for parsing output schemas
 */
export interface JsonSchema {
	type?: string | string[];
	properties?: Record<string, JsonSchema>;
	items?: JsonSchema;
	additionalProperties?: boolean | JsonSchema;
	required?: string[];
	oneOf?: JsonSchema[];
	anyOf?: JsonSchema[];
	allOf?: JsonSchema[];
	enum?: unknown[];
	const?: unknown;
	$ref?: string;
}

// =============================================================================
// Schema Discovery & JSON Schema to TypeScript Conversion
// =============================================================================

/**
 * Cache for discovered schemas per node (keyed by nodeName:version)
 */
const schemaCache = new Map<string, OutputSchema[]>();

/**
 * Recursively search for a __schema__ directory matching one of the target names
 *
 * @param dir Directory to search in
 * @param targetNames List of possible folder names to match (e.g., ['Gmail', 'gmail', 'GMAIL'])
 * @returns Path to the __schema__ directory, or undefined if not found
 */
function findNestedSchemaDir(dir: string, targetNames: string[]): string | undefined {
	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return undefined;
	}

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;

		const entryPath = path.join(dir, entry.name);

		// Check if this directory matches our target and has __schema__
		if (targetNames.includes(entry.name)) {
			const schemaPath = path.join(entryPath, '__schema__');
			if (fs.existsSync(schemaPath)) {
				return schemaPath;
			}
		}

		// Recurse into subdirectories (but skip __schema__ dirs and node_modules)
		if (entry.name !== '__schema__' && entry.name !== 'node_modules') {
			const found = findNestedSchemaDir(entryPath, targetNames);
			if (found) return found;
		}
	}

	return undefined;
}

/**
 * Find the schema directory for a node, searching both flat and nested paths
 *
 * @param baseName The base node name (e.g., 'gmail')
 * @returns Path to the __schema__ directory, or undefined if not found
 */
function findSchemaDirectory(baseName: string, schemaPath?: string): string | undefined {
	// If explicit schemaPath is provided, use it directly
	if (schemaPath) {
		const explicitPath = path.join(NODES_BASE_DIST, schemaPath, '__schema__');
		if (fs.existsSync(explicitPath)) {
			return explicitPath;
		}
	}

	const possibleNames = [
		baseName.charAt(0).toUpperCase() + baseName.slice(1), // Gmail
		baseName, // gmail
		baseName.toUpperCase(), // GMAIL
	];

	// Try flat paths first (most common case)
	for (const folderName of possibleNames) {
		const flatPath = path.join(NODES_BASE_DIST, folderName, '__schema__');
		if (fs.existsSync(flatPath)) {
			return flatPath;
		}
	}

	// Search recursively for nested paths (e.g., Google/Gmail/__schema__)
	return findNestedSchemaDir(NODES_BASE_DIST, possibleNames);
}

/**
 * Discover output schemas for a node from the __schema__ directory
 * Schema path pattern: dist/nodes/{NodeFolder}/__schema__/v{version}.0.0/{resource}/{operation}.json
 * Also supports nested paths like: dist/nodes/{Parent}/{NodeFolder}/__schema__/...
 *
 * @param nodeName Full node name (e.g., 'n8n-nodes-base.freshservice')
 * @param version The node version number
 * @param schemaPath Optional explicit path to schema directory relative to nodes-base/dist/nodes/
 * @returns Array of discovered output schemas
 */
export function discoverSchemasForNode(
	nodeName: string,
	version: number,
	schemaPath?: string,
): OutputSchema[] {
	const cacheKey = `${nodeName}:${version}`;
	if (schemaCache.has(cacheKey)) {
		return schemaCache.get(cacheKey)!;
	}

	const schemas: OutputSchema[] = [];

	// Extract node folder name from the node name
	// n8n-nodes-base.freshservice -> freshservice
	const baseName = nodeName.split('.').pop() ?? '';

	// Find schema directory (handles both flat and nested paths, or explicit schemaPath)
	const schemaDir = findSchemaDirectory(baseName, schemaPath);
	if (!schemaDir) {
		schemaCache.set(cacheKey, schemas);
		return schemas;
	}

	// Try to find version directory - try exact match first, then closest lower version
	const versionDir = findVersionDirectory(schemaDir, version);
	if (!versionDir) {
		schemaCache.set(cacheKey, schemas);
		return schemas;
	}

	// Scan version directory entries
	try {
		const entries = fs.readdirSync(versionDir, { withFileTypes: true });

		for (const entry of entries) {
			// JSON files directly in the version directory (nodes without resource/operation)
			if (entry.isFile() && entry.name.endsWith('.json')) {
				const operationName = entry.name.replace('.json', '');
				const filePath = path.join(versionDir, entry.name);

				try {
					const schemaContent = fs.readFileSync(filePath, 'utf-8');
					const schema = JSON.parse(schemaContent) as JsonSchema;
					schemas.push({
						resource: '',
						operation: operationName,
						schema,
					});
				} catch {
					// Skip invalid JSON files
				}
				continue;
			}

			// Resource subdirectories containing operation JSON files
			if (!entry.isDirectory()) continue;

			const resourceDir = path.join(versionDir, entry.name);
			const operations = fs.readdirSync(resourceDir, { withFileTypes: true });

			for (const opEntry of operations) {
				if (!opEntry.isFile() || !opEntry.name.endsWith('.json')) continue;

				const operationName = opEntry.name.replace('.json', '');
				const schemaPath = path.join(resourceDir, opEntry.name);

				try {
					const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
					const schema = JSON.parse(schemaContent) as JsonSchema;
					schemas.push({
						resource: entry.name,
						operation: operationName,
						schema,
					});
				} catch {
					// Skip invalid JSON files
				}
			}
		}
	} catch {
		// Skip if directory can't be read
	}

	schemaCache.set(cacheKey, schemas);
	return schemas;
}

/**
 * Find the best matching version directory for a given version
 * Tries exact match first (v{version}.0.0), then scans for closest lower version
 *
 * @param schemaDir Path to the __schema__ directory
 * @param version Target version number
 * @returns Path to version directory, or undefined if not found
 */
function findVersionDirectory(schemaDir: string, version: number): string | undefined {
	// Try exact match first: v1.0.0, v2.0.0, etc.
	const exactPath = path.join(schemaDir, `v${version}.0.0`);
	if (fs.existsSync(exactPath)) {
		return exactPath;
	}

	// Scan for available versions and find closest lower
	try {
		const entries = fs.readdirSync(schemaDir, { withFileTypes: true });
		const versionDirs = entries
			.filter((e) => e.isDirectory() && /^v\d+(\.\d+)*$/.test(e.name))
			.map((e) => {
				const match = e.name.match(/^v(\d+)/);
				return {
					name: e.name,
					majorVersion: match ? parseInt(match[1], 10) : 0,
				};
			})
			.filter((v) => v.majorVersion <= version)
			.sort((a, b) => b.majorVersion - a.majorVersion);

		if (versionDirs.length > 0) {
			return path.join(schemaDir, versionDirs[0].name);
		}
	} catch {
		// Ignore read errors
	}

	return undefined;
}

/**
 * Convert a JSON Schema to TypeScript type string
 *
 * @param schema The JSON Schema to convert
 * @param indent Current indentation level
 * @returns TypeScript type string
 */
export function jsonSchemaToTypeScript(schema: JsonSchema, indent = 0): string {
	const indentStr = INDENT.repeat(indent);
	const nextIndent = INDENT.repeat(indent + 1);

	// Handle array of types (e.g., ["string", "null"])
	if (Array.isArray(schema.type)) {
		const types = schema.type.map((t) => jsonSchemaToTypeScript({ ...schema, type: t }, indent));
		return types.join(' | ');
	}

	// Handle enum
	if (schema.enum) {
		return schema.enum
			.map((v) => {
				if (typeof v === 'string') return `'${v}'`;
				if (v === null) return 'null';
				if (typeof v === 'object') return JSON.stringify(v);
				// eslint-disable-next-line @typescript-eslint/no-base-to-string -- Objects already handled above
				return String(v);
			})
			.join(' | ');
	}

	// Handle const
	if (schema.const !== undefined) {
		if (typeof schema.const === 'string') return `'${schema.const}'`;
		if (schema.const === null) return 'null';
		if (typeof schema.const === 'object') return JSON.stringify(schema.const);
		// eslint-disable-next-line @typescript-eslint/no-base-to-string -- Objects already handled above
		return String(schema.const);
	}

	// Handle oneOf/anyOf
	if (schema.oneOf || schema.anyOf) {
		const variants = schema.oneOf ?? schema.anyOf ?? [];
		return variants.map((v) => jsonSchemaToTypeScript(v, indent)).join(' | ');
	}

	// Handle allOf (intersection)
	if (schema.allOf) {
		return schema.allOf.map((v) => jsonSchemaToTypeScript(v, indent)).join(' & ');
	}

	// Handle type-specific conversions
	switch (schema.type) {
		case 'string':
			return 'string';
		case 'integer':
		case 'number':
			return 'number';
		case 'boolean':
			return 'boolean';
		case 'null':
			return 'null';
		case 'array':
			if (schema.items) {
				return `Array<${jsonSchemaToTypeScript(schema.items, indent)}>`;
			}
			return 'unknown[]';
		case 'object':
			if (schema.properties && Object.keys(schema.properties).length > 0) {
				const required = new Set(schema.required ?? []);
				const props = Object.entries(schema.properties).map(([key, propSchema]) => {
					const optional = required.has(key) ? '' : '?';
					const quotedKey = needsQuoting(key) ? `'${key}'` : key;
					const propType = jsonSchemaToTypeScript(propSchema, indent + 1);
					return `${nextIndent}${quotedKey}${optional}: ${propType};`;
				});
				return `{\n${props.join('\n')}\n${indentStr}}`;
			}
			if (schema.additionalProperties) {
				if (typeof schema.additionalProperties === 'boolean') {
					return 'Record<string, unknown>';
				}
				return `Record<string, ${jsonSchemaToTypeScript(schema.additionalProperties, indent)}>`;
			}
			return 'Record<string, unknown>';
		default:
			return 'unknown';
	}
}

/**
 * Find the output schema for a specific resource/operation combination
 *
 * @param schemas Array of discovered schemas for the node
 * @param resource The resource name (e.g., 'ticket')
 * @param operation The operation name (e.g., 'get')
 * @returns The matching schema, or undefined if not found
 */
export function findSchemaForOperation(
	schemas: OutputSchema[],
	resource: string,
	operation: string,
): OutputSchema | undefined {
	return schemas.find(
		(s) => s.resource.toLowerCase() === resource.toLowerCase() && s.operation === operation,
	);
}

/**
 * Info about a generated config type for linking with output types
 */
export interface ConfigTypeInfo {
	/** The TypeScript type name (e.g., 'FreshserviceV1TicketGetConfig') */
	typeName: string;
	/** Resource name from discriminator (e.g., 'ticket'), undefined if no resource */
	resource?: string;
	/** Operation name from discriminator (e.g., 'get'), undefined if no operation */
	operation?: string;
	/** Other discriminator values (e.g., mode, authentication) */
	discriminators: Record<string, string>;
}

/**
 * Result of generating discriminated union types
 */
export interface DiscriminatedUnionResult {
	/** The generated TypeScript code */
	code: string;
	/** Info about each config type generated */
	configTypes: ConfigTypeInfo[];
}

// =============================================================================
// Property Type Mapping
// =============================================================================

/**
 * Generate inline type for resourceLocator based on available modes
 */
function generateResourceLocatorType(prop: NodeProperty): string {
	if (prop.modes && prop.modes.length > 0) {
		const modeNames = prop.modes.map((m) => `'${m.name}'`).join(' | ');
		return `{ __rl: true; mode: ${modeNames}; value: string; cachedResultName?: string }`;
	}
	return '{ __rl: true; mode: string; value: string; cachedResultName?: string }';
}

/**
 * Generate inline type for a nested property (used in fixedCollection)
 * This is a forward declaration - the actual function is defined below
 */
function mapNestedPropertyType(
	prop: NodeProperty,
	discriminatorContext?: DiscriminatorCombination,
): string {
	const result = mapNestedPropertyTypeInner(prop, discriminatorContext);
	if (prop.noDataExpression) {
		return stripExpressionFromType(result);
	}
	return result;
}

function mapNestedPropertyTypeInner(
	prop: NodeProperty,
	discriminatorContext?: DiscriminatorCombination,
): string {
	// Handle dynamic options (loadOptionsMethod)
	if (prop.typeOptions?.loadOptionsMethod || prop.typeOptions?.loadOptionsDependsOn) {
		// Dynamic options fallback to string, but preserve complex types
		switch (prop.type) {
			case 'options':
				return 'string | Expression<string>';
			case 'multiOptions':
				return 'string[]';
			case 'resourceLocator':
				return generateResourceLocatorType(prop);
			case 'filter':
				return 'FilterValue';
			case 'assignmentCollection':
				return 'AssignmentCollectionValue';
			default:
				return 'string | Expression<string>';
		}
	}

	switch (prop.type) {
		case 'string':
			if (prop.builderHint?.placeholderSupported === false) {
				return 'string | Expression<string>';
			}
			return 'string | Expression<string> | PlaceholderValue';
		case 'number':
			return 'number | Expression<number>';
		case 'boolean':
			return 'boolean | Expression<boolean>';
		case 'options':
			if (prop.options && prop.options.length > 0 && prop.options[0].value !== undefined) {
				const values = prop.options.map((opt) => {
					if (typeof opt.value === 'string') {
						const escaped = opt.value
							.replace(/\\/g, '\\\\')
							.replace(/'/g, "\\'")
							.replace(/\n/g, '\\n')
							.replace(/\r/g, '\\r')
							.replace(/\t/g, '\\t');
						return `'${escaped}'`;
					}
					return String(opt.value);
				});
				const valueType = typeof prop.options[0].value;
				const expressionType =
					valueType === 'number'
						? 'Expression<number>'
						: valueType === 'boolean'
							? 'Expression<boolean>'
							: 'Expression<string>';
				return `${values.join(' | ')} | ${expressionType}`;
			}
			return 'string | Expression<string>';
		case 'multiOptions':
			if (prop.options && prop.options.length > 0 && prop.options[0].value !== undefined) {
				const values = prop.options.map((opt) => {
					if (typeof opt.value === 'string') {
						return `'${opt.value}'`;
					}
					return String(opt.value);
				});
				return `Array<${values.join(' | ')}>`;
			}
			return 'string[]';
		case 'json':
			return 'IDataObject | string | Expression<string>';
		case 'resourceLocator':
			return generateResourceLocatorType(prop);
		case 'filter':
			return 'FilterValue';
		case 'assignmentCollection':
			return 'AssignmentCollectionValue';
		case 'fixedCollection':
			return generateFixedCollectionType(prop, discriminatorContext);
		case 'collection':
			return generateCollectionType(prop, discriminatorContext);
		case 'dateTime':
			return 'string | Expression<string>';
		case 'color':
			return 'string | Expression<string>';
		case 'hidden':
			return 'unknown';
		case 'notice':
		case 'curlImport':
		case 'credentials':
			return '';
		case 'credentialsSelect':
			// credentialsSelect is a string value (credential type name)
			return 'string | Expression<string>';
		default:
			return 'unknown';
	}
}

/**
 * Check if a property name needs quoting in TypeScript
 */
function needsQuoting(name: string): boolean {
	return RESERVED_WORDS.has(name) || !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
}

/**
 * Quote a property name if needed for TypeScript
 */
function quotePropertyName(name: string): string {
	if (needsQuoting(name)) {
		return `'${name.replace(/'/g, "\\'")}'`;
	}
	return name;
}

/**
 * Determine if a property should be optional in the generated type.
 * A property is optional if it's not required OR if it has a default value.
 * Properties with defaults can be omitted - the default will be used at runtime.
 */
function isPropertyOptional(prop: NodeProperty): boolean {
	const hasDefault = 'default' in prop && prop.default !== undefined;
	return !prop.required || hasDefault;
}

/**
 * Generate a compact JSDoc comment for a nested property (used in fixedCollections)
 * Returns a multi-line JSDoc that can be placed before property definitions
 */
function generateNestedPropertyJSDoc(
	prop: NodeProperty,
	indent: string,
	discriminatorContext?: DiscriminatorCombination,
): string {
	const lines: string[] = [];

	// Description
	const description = prop.description ?? prop.displayName;
	if (description) {
		const safeDescription = description
			.replace(/\*\//g, '*\\/')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
		lines.push(`${indent}/** ${safeDescription}`);
	} else {
		lines.push(`${indent}/**`);
	}

	// Hint
	if (prop.hint) {
		const safeHint = prop.hint.replace(/\*\//g, '*\\/').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		lines.push(`${indent} * @hint ${safeHint}`);
	}

	// Builder hint - guidance for AI/workflow builders
	if (prop.builderHint) {
		const safeBuilderHint = prop.builderHint.message
			.replace(/\*\//g, '*\\/')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
		lines.push(`${indent} * @builderHint ${safeBuilderHint}`);
	}

	// Display options - filter out @version since version is implicit from the file
	// Also filter out conditions that match the current discriminator context (redundant)
	if (prop.displayOptions) {
		if (prop.displayOptions.show && Object.keys(prop.displayOptions.show).length > 0) {
			const filteredShow = Object.entries(prop.displayOptions.show).filter(([key, values]) => {
				// Filter out @version (existing behavior)
				if (key === '@version') return false;
				// Filter out conditions that match current discriminator context
				// Strip leading '/' from key for root-level property references
				const normalizedKey = key.startsWith('/') ? key.slice(1) : key;
				if (discriminatorContext?.[normalizedKey] !== undefined) {
					const showValues = values;
					// If the discriminator value is in the show list, this is redundant
					if (showValues.includes(discriminatorContext[normalizedKey])) return false;
				}
				return true;
			});
			if (filteredShow.length > 0) {
				const showConditions = filteredShow
					.map(([key, values]) => `${key}: [${values.map((v) => JSON.stringify(v)).join(', ')}]`)
					.join(', ');
				lines.push(`${indent} * @displayOptions.show { ${showConditions} }`);
			}
		}
		if (prop.displayOptions.hide && Object.keys(prop.displayOptions.hide).length > 0) {
			const filteredHide = Object.entries(prop.displayOptions.hide).filter(([key, values]) => {
				// Filter out @version (existing behavior)
				if (key === '@version') return false;
				// Filter out conditions that match current discriminator context
				// Strip leading '/' from key for root-level property references
				const normalizedKey = key.startsWith('/') ? key.slice(1) : key;
				if (discriminatorContext?.[normalizedKey] !== undefined) {
					const hideValues = values;
					// If the discriminator value is in the hide list, this is redundant
					if (hideValues.includes(discriminatorContext[normalizedKey])) return false;
				}
				return true;
			});
			if (filteredHide.length > 0) {
				const hideConditions = filteredHide
					.map(([key, values]) => `${key}: [${values.map((v) => JSON.stringify(v)).join(', ')}]`)
					.join(', ');
				lines.push(`${indent} * @displayOptions.hide { ${hideConditions} }`);
			}
		}
	}

	// Default value - skip multi-line strings to avoid breaking JSDoc comments
	if (prop.default !== undefined && prop.default !== null && prop.default !== '') {
		let defaultStr: string;
		if (typeof prop.default === 'object') {
			defaultStr = JSON.stringify(prop.default);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-base-to-string -- Object case handled above
			defaultStr = String(prop.default);
		}
		if (!defaultStr.includes('\n')) {
			lines.push(`${indent} * @default ${defaultStr}`);
		}
	}

	lines.push(`${indent} */`);
	return lines.join('\n');
}

/**
 * Generate inline type for a fixedCollection property
 * This generates proper nested types instead of Record<string, unknown>
 */
function generateFixedCollectionType(
	prop: NodeProperty,
	discriminatorContext?: DiscriminatorCombination,
): string {
	if (!prop.options || prop.options.length === 0) {
		return 'Record<string, unknown>';
	}

	const isMultipleValues = prop.typeOptions?.multipleValues === true;
	const groups: string[] = [];

	for (const group of prop.options) {
		// Skip if this is an option value (not a fixedCollection group)
		if (group.value !== undefined || !group.values) {
			continue;
		}

		const groupName = quotePropertyName(group.name);
		const nestedProps: string[] = [];

		for (const nestedProp of group.values) {
			// Skip notice and other display-only types
			if (['notice', 'curlImport', 'credentials'].includes(nestedProp.type)) {
				continue;
			}

			const nestedType = mapNestedPropertyType(nestedProp, discriminatorContext);
			if (nestedType) {
				const quotedName = quotePropertyName(nestedProp.name);
				// Generate JSDoc for the nested property
				const jsDoc = generateNestedPropertyJSDoc(
					nestedProp,
					INDENT.repeat(3),
					discriminatorContext,
				);
				nestedProps.push(`${jsDoc}\n${INDENT.repeat(3)}${quotedName}?: ${nestedType}`);
			}
		}

		if (nestedProps.length > 0) {
			const innerType = `{\n${nestedProps.join(';\n')};\n${INDENT.repeat(2)}}`;
			const groupType = isMultipleValues ? `Array<${innerType}>` : innerType;

			// Generate JSDoc for the group if it has builderHint or description
			const groupJsDocLines: string[] = [];
			if (group.displayName || group.description) {
				const desc = (group.description ?? group.displayName ?? '')
					.replace(/\*\//g, '*\\/')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;');
				groupJsDocLines.push(`${INDENT.repeat(2)}/** ${desc}`);
			}
			if (group.builderHint) {
				const safeBuilderHint = group.builderHint.message
					.replace(/\*\//g, '*\\/')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;');
				if (groupJsDocLines.length === 0) {
					groupJsDocLines.push(`${INDENT.repeat(2)}/**`);
				}
				groupJsDocLines.push(`${INDENT.repeat(2)} * @builderHint ${safeBuilderHint}`);
			}

			if (groupJsDocLines.length > 0) {
				groupJsDocLines.push(`${INDENT.repeat(2)} */`);
				groups.push(
					`${groupJsDocLines.join('\n')}\n${INDENT.repeat(2)}${groupName}?: ${groupType}`,
				);
			} else {
				groups.push(`${groupName}?: ${groupType}`);
			}
		}
	}

	if (groups.length === 0) {
		return 'Record<string, unknown>';
	}

	return `{\n${INDENT.repeat(2)}${groups.join(`;\n${INDENT.repeat(2)}`)};\n${INDENT}}`;
}

/**
 * Merge properties with the same name for collection/fixedCollection types.
 * When multiple properties have the same name (e.g., multiple 'options' collections
 * with different displayOptions), their nested options should be merged.
 *
 * @param properties - Array of node properties, possibly with duplicates
 * @returns Array of properties with duplicates merged
 */
function mergeCollectionProperties(properties: NodeProperty[]): NodeProperty[] {
	const seenProps = new Map<string, NodeProperty>();

	for (const prop of properties) {
		// Skip display-only types
		if (['notice', 'curlImport', 'credentials'].includes(prop.type)) {
			continue;
		}

		if (seenProps.has(prop.name)) {
			const existingProp = seenProps.get(prop.name)!;

			// For collection/fixedCollection types, merge nested options
			if (
				(prop.type === 'collection' || prop.type === 'fixedCollection') &&
				prop.options &&
				existingProp.options
			) {
				// Merge options, avoiding duplicates by name
				const existingOptionNames = new Set(existingProp.options.map((o) => o.name));
				for (const opt of prop.options) {
					if (!existingOptionNames.has(opt.name)) {
						existingProp.options.push(opt);
					}
				}
			}
			// Don't add duplicate to output - we've merged into existing
			continue;
		}

		// Create a shallow copy to avoid mutating the original when merging
		seenProps.set(prop.name, {
			...prop,
			options: prop.options ? [...prop.options] : undefined,
		});
	}

	return Array.from(seenProps.values());
}

/**
 * Generate inline type for a collection property
 * Collections have a flat structure with optional nested properties
 */
function generateCollectionType(
	prop: NodeProperty,
	discriminatorContext?: DiscriminatorCombination,
): string {
	if (!prop.options || prop.options.length === 0) {
		return 'Record<string, unknown>';
	}

	const nestedProps: string[] = [];

	for (const nestedProp of prop.options) {
		// Skip if this is a group (has values array) - those are for fixedCollection
		if (nestedProp.values !== undefined) {
			continue;
		}

		// Skip notice and other display-only types
		const nestedType = (nestedProp as NodeProperty).type;
		if (['notice', 'curlImport', 'credentials'].includes(nestedType)) {
			continue;
		}

		const propType = mapNestedPropertyType(nestedProp as NodeProperty, discriminatorContext);
		if (propType) {
			const quotedName = quotePropertyName(nestedProp.name);
			// Generate JSDoc for the nested property
			const jsDoc = generateNestedPropertyJSDoc(
				nestedProp as NodeProperty,
				INDENT.repeat(2),
				discriminatorContext,
			);
			nestedProps.push(`${jsDoc}\n${INDENT.repeat(2)}${quotedName}?: ${propType}`);
		}
	}

	if (nestedProps.length === 0) {
		return 'Record<string, unknown>';
	}

	return `{\n${nestedProps.join(';\n')};\n${INDENT}}`;
}

/**
 * Strip Expression<...> and PlaceholderValue from a type string.
 * Used when noDataExpression is true to produce plain types.
 */
function stripExpressionFromType(typeStr: string): string {
	return typeStr
		.replace(/\s*\|\s*Expression<[^>]+>/g, '')
		.replace(/\s*\|\s*PlaceholderValue/g, '')
		.trim();
}

/**
 * Map n8n property types to TypeScript types with Expression wrappers
 */
export function mapPropertyType(
	prop: NodeProperty,
	discriminatorContext?: DiscriminatorCombination,
): string {
	const result = mapPropertyTypeInner(prop, discriminatorContext);
	if (prop.noDataExpression) {
		return stripExpressionFromType(result);
	}
	return result;
}

function mapPropertyTypeInner(
	prop: NodeProperty,
	discriminatorContext?: DiscriminatorCombination,
): string {
	// Special handling for known credentialsSelect fields with fixed values
	if (prop.type === 'credentialsSelect' && prop.name === 'genericAuthType') {
		const values = GENERIC_AUTH_TYPE_VALUES.map((v) => `'${v}'`).join(' | ');
		return `${values} | Expression<string>`;
	}

	// Handle dynamic options (loadOptionsMethod)
	if (prop.typeOptions?.loadOptionsMethod || prop.typeOptions?.loadOptionsDependsOn) {
		// Dynamic options fallback to string, but preserve complex types
		switch (prop.type) {
			case 'options':
				return 'string | Expression<string>';
			case 'multiOptions':
				return 'string[]';
			case 'resourceLocator':
				return generateResourceLocatorType(prop);
			case 'filter':
				return 'FilterValue';
			case 'assignmentCollection':
				return 'AssignmentCollectionValue';
			default:
				return 'string | Expression<string>';
		}
	}

	switch (prop.type) {
		case 'string':
			if (prop.builderHint?.placeholderSupported === false) {
				return 'string | Expression<string>';
			}
			return 'string | Expression<string> | PlaceholderValue';

		case 'number':
			return 'number | Expression<number>';

		case 'boolean':
			return 'boolean | Expression<boolean>';

		case 'options':
			if (prop.options && prop.options.length > 0) {
				const values = prop.options.map((opt) => {
					if (typeof opt.value === 'string') {
						// Escape special characters in string literals
						const escaped = opt.value
							.replace(/\\/g, '\\\\')
							.replace(/'/g, "\\'")
							.replace(/\n/g, '\\n')
							.replace(/\r/g, '\\r')
							.replace(/\t/g, '\\t');
						return `'${escaped}'`;
					}
					return String(opt.value);
				});
				const valueType = typeof prop.options[0].value;
				const expressionType =
					valueType === 'number'
						? 'Expression<number>'
						: valueType === 'boolean'
							? 'Expression<boolean>'
							: 'Expression<string>';
				return `${values.join(' | ')} | ${expressionType}`;
			}
			return 'string | Expression<string>';

		case 'multiOptions':
			if (prop.options && prop.options.length > 0) {
				const values = prop.options.map((opt) => {
					if (typeof opt.value === 'string') {
						return `'${opt.value}'`;
					}
					return String(opt.value);
				});
				return `Array<${values.join(' | ')}>`;
			}
			return 'string[]';

		case 'json':
			return 'IDataObject | string | Expression<string>';

		case 'resourceLocator':
			return generateResourceLocatorType(prop);

		case 'filter':
			return 'FilterValue';

		case 'assignmentCollection':
			return 'AssignmentCollectionValue';

		case 'fixedCollection':
			return generateFixedCollectionType(prop, discriminatorContext);

		case 'collection':
			return generateCollectionType(prop, discriminatorContext);

		case 'dateTime':
			return 'string | Expression<string>';

		case 'color':
			return 'string | Expression<string>';

		case 'hidden':
			return 'unknown';

		case 'notice':
		case 'curlImport':
		case 'credentials':
			return ''; // Skip these types

		case 'credentialsSelect':
			// credentialsSelect is a string value (credential type name)
			return 'string | Expression<string>';

		default:
			return 'unknown';
	}
}

// =============================================================================
// Discriminated Union Generation
// =============================================================================

/**
 * Extract all discriminator combinations from a node's properties
 * Handles resource/operation, agent, promptType, mode, authentication patterns
 */
export function extractDiscriminatorCombinations(
	node: NodeTypeDescription,
): DiscriminatorCombination[] {
	const combinations: DiscriminatorCombination[] = [];

	// Find discriminator properties
	const resourceProp = node.properties.find((p) => p.name === 'resource' && p.type === 'options');
	const operationProps = node.properties.filter(
		(p) => p.name === 'operation' && p.type === 'options',
	);

	// Check for resource/operation pattern (most common)
	if (resourceProp && operationProps.length > 0) {
		// Extract resource values
		const resources = resourceProp.options?.map((o) => String(o.value)) ?? [];

		// For each resource, find its operations
		for (const resource of resources) {
			// Find operation prop that shows for this resource
			const opProp = operationProps.find((op) => {
				const showResource = op.displayOptions?.show?.resource;
				return showResource?.includes(resource);
			});

			if (opProp?.options) {
				for (const opOption of opProp.options) {
					combinations.push({
						resource,
						operation: String(opOption.value),
					});
				}
			}
		}

		return combinations;
	}

	// Check for other single-discriminator patterns
	// Only 'mode' benefits from splitting - other fields like 'authentication', 'promptType', 'agent'
	// should be treated as regular properties with union types, not as discriminators
	const otherDiscriminators = ['mode'];
	for (const discName of otherDiscriminators) {
		const discProp = node.properties.find(
			(p) => p.name === discName && p.type === 'options' && p.options && p.options.length > 1,
		);

		// Skip if this discriminator has displayOptions (it's conditionally shown)
		// Exception: @version displayOptions are fine since version filtering is handled separately
		if (discProp?.displayOptions) {
			/* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- Logical OR for boolean combination */
			const hasNonVersionDisplayOptions =
				(discProp.displayOptions.show &&
					Object.keys(discProp.displayOptions.show).some((k) => k !== '@version')) ||
				(discProp.displayOptions.hide &&
					Object.keys(discProp.displayOptions.hide).some((k) => k !== '@version'));
			/* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
			if (hasNonVersionDisplayOptions) {
				continue;
			}
		}

		if (discProp?.options) {
			// Check if any properties depend on this discriminator
			const hasDependentProps = node.properties.some(
				(p) =>
					p.displayOptions?.show?.[discName] !== undefined ||
					p.displayOptions?.hide?.[discName] !== undefined,
			);

			if (hasDependentProps) {
				for (const opt of discProp.options) {
					combinations.push({
						[discName]: String(opt.value),
					});
				}
				return combinations;
			}
		}
	}

	return [];
}

/**
 * Get properties applicable to a specific discriminator combination.
 *
 * This function filters properties for code generation purposes.
 * It checks if a property "potentially applies" to a given discriminator combination
 * (resource, operation, mode) by evaluating show/hide conditions.
 *
 * Uses the centralized checkConditions function to support _cnd operators.
 */
export function getPropertiesForCombination(
	node: NodeTypeDescription,
	combination: DiscriminatorCombination,
): NodeProperty[] {
	const result: NodeProperty[] = [];

	for (const prop of node.properties) {
		// Skip discriminator fields themselves
		if (DISCRIMINATOR_FIELDS.includes(prop.name)) {
			continue;
		}

		// Skip display-only types
		if (['notice', 'curlImport', 'credentials'].includes(prop.type)) {
			continue;
		}

		// Check if this property applies to the combination
		if (prop.displayOptions?.show) {
			let matches = true;

			// Check each discriminator in the show condition
			for (const [key, conditions] of Object.entries(prop.displayOptions.show)) {
				if (combination[key] !== undefined) {
					// This property has a condition on this discriminator
					// Use checkConditions to support _cnd operators
					if (!checkConditions(conditions, [combination[key]])) {
						matches = false;
						break;
					}
				}
			}

			if (matches) {
				result.push(prop);
			}
		} else if (prop.displayOptions?.hide) {
			// Check hide conditions - only exclude if combination explicitly matches hide
			let excluded = false;

			for (const [key, conditions] of Object.entries(prop.displayOptions.hide)) {
				if (combination[key] !== undefined) {
					if (checkConditions(conditions, [combination[key]])) {
						excluded = true;
						break;
					}
				}
			}

			if (!excluded) {
				result.push(prop);
			}
		} else {
			// Property has no conditions - include it (global property)
			result.push(prop);
		}
	}

	return result;
}

/**
 * Represents a conditional version check (e.g., { _cnd: { gte: 3.1 } })
 */
interface VersionCondition {
	_cnd: {
		gt?: number;
		gte?: number;
		lt?: number;
		lte?: number;
	};
}

/**
 * Check if a version matches a single condition item (number or VersionCondition)
 */
function versionMatchesCondition(version: number, condition: number | VersionCondition): boolean {
	// If it's a simple number, check for equality
	if (typeof condition === 'number') {
		return version === condition;
	}

	// It's a conditional expression like { _cnd: { gte: 3.1 } }
	if (condition._cnd) {
		const { gt, gte, lt, lte } = condition._cnd;
		if (gt !== undefined && !(version > gt)) return false;
		if (gte !== undefined && !(version >= gte)) return false;
		if (lt !== undefined && !(version < lt)) return false;
		if (lte !== undefined && !(version <= lte)) return false;
		return true;
	}

	return false;
}

/**
 * Check if a property applies to a specific version based on displayOptions
 * @param prop The property to check
 * @param version The specific version number to check for
 * @returns true if the property applies to this version
 */
export function propertyAppliesToVersion(prop: NodeProperty, version: number): boolean {
	// If no displayOptions, property applies to all versions
	if (!prop.displayOptions) {
		return true;
	}

	// Check show conditions for @version
	if (prop.displayOptions.show?.['@version']) {
		const allowedVersions = prop.displayOptions.show['@version'] as Array<
			number | VersionCondition
		>;
		// Property should show if ANY version condition matches
		const anyMatches = allowedVersions.some((cond) => versionMatchesCondition(version, cond));
		if (!anyMatches) {
			return false;
		}
	}

	// Check hide conditions for @version
	if (prop.displayOptions.hide?.['@version']) {
		const hiddenVersions = prop.displayOptions.hide['@version'] as Array<number | VersionCondition>;
		// Property should hide if ANY version condition matches
		const anyMatches = hiddenVersions.some((cond) => versionMatchesCondition(version, cond));
		if (anyMatches) {
			return false;
		}
	}

	return true;
}

/**
 * Filter node properties to only include those that apply to a specific version
 * @param properties The full list of node properties
 * @param version The specific version to filter for
 * @returns Properties that apply to the given version
 */
export function filterPropertiesForVersion(
	properties: NodeProperty[],
	version: number,
): NodeProperty[] {
	return properties.filter((prop) => propertyAppliesToVersion(prop, version));
}

/**
 * Generate discriminated union types for a node
 */
export function generateDiscriminatedUnion(node: NodeTypeDescription): string {
	const combinations = extractDiscriminatorCombinations(node);
	const prefix = getPackagePrefix(node.name);
	const nodeName = prefix + toPascalCase(getNodeBaseName(node.name));
	const version = getHighestVersion(node.version);
	const versionSuffix = versionToTypeName(version);
	const lines: string[] = [];

	if (combinations.length === 0) {
		// No discriminators - generate simple interface
		const configName = `${nodeName}${versionSuffix}Params`;
		lines.push(`export interface ${configName} {`);

		// Merge duplicate collection properties (e.g., multiple 'options' collections with different displayOptions)
		const mergedProps = mergeCollectionProperties(node.properties);
		for (const prop of mergedProps) {
			const propLine = generatePropertyLine(prop, isPropertyOptional(prop));
			if (propLine) {
				lines.push(propLine);
			}
		}

		lines.push('}');
		return lines.join('\n');
	}

	// Generate individual config types for each combination
	const configTypeNames: string[] = [];

	for (const combo of combinations) {
		// Build config name from all discriminator values
		const comboValues = Object.entries(combo)
			.filter(([_, v]) => v !== undefined)
			.map(([_, v]) => toPascalCase(v!));
		const configName = `${nodeName}${comboValues.join('')}Params`;
		configTypeNames.push(configName);

		// Get properties for this combination
		const props = getPropertiesForCombination(node, combo);

		// Find description for JSDoc from any discriminator property
		let description: string | undefined;
		for (const [key, value] of Object.entries(combo)) {
			if (value === undefined) continue;
			const discProp = node.properties.find(
				(p) => p.name === key && p.options?.some((o) => o.value === value),
			);
			if (discProp) {
				description = discProp.options?.find((o) => o.value === value)?.description;
				if (description) break;
			}
		}

		if (description) {
			lines.push(`/** ${description} */`);
		}

		lines.push(`export type ${configName} = {`);

		// Add discriminator fields
		for (const [key, value] of Object.entries(combo)) {
			if (value !== undefined) {
				lines.push(`${INDENT}${key}: '${value}';`);
			}
		}

		// Track seen property names to avoid duplicates
		const seenNames = new Set<string>();
		for (const prop of props) {
			if (seenNames.has(prop.name)) {
				continue; // Skip duplicate property names
			}
			seenNames.add(prop.name);
			// Pass combo as discriminator context to filter redundant displayOptions
			const propLine = generatePropertyLine(prop, isPropertyOptional(prop), combo);
			if (propLine) {
				lines.push(propLine);
			}
		}

		lines.push('};');
		lines.push('');
	}

	return lines.join('\n');
}

// =============================================================================
// JSDoc Generation
// =============================================================================

/**
 * Generate JSDoc comment for a property
 */
export function generatePropertyJSDoc(
	prop: NodeProperty,
	discriminatorContext?: DiscriminatorCombination,
): string {
	const lines: string[] = ['/**'];

	// Description
	const description = prop.description ?? prop.displayName;
	// Escape potential JSDoc breakers
	const safeDescription = description
		.replace(/\*\//g, '*\\/')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
	lines.push(` * ${safeDescription}`);

	// Hint - additional guidance for users
	if (prop.hint) {
		const safeHint = prop.hint.replace(/\*\//g, '*\\/').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		lines.push(` * @hint ${safeHint}`);
	}

	// Builder hint - guidance for AI/workflow builders
	if (prop.builderHint) {
		const safeBuilderHint = prop.builderHint.message
			.replace(/\*\//g, '*\\/')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
		lines.push(` * @builderHint ${safeBuilderHint}`);
	}

	// Display options - conditions for when this property is shown/hidden
	// Filter out @version since version is implicit from the file
	// Filter out conditions that match the current discriminator context (redundant)
	if (prop.displayOptions) {
		if (prop.displayOptions.show && Object.keys(prop.displayOptions.show).length > 0) {
			const filteredShow = Object.entries(prop.displayOptions.show).filter(([key, values]) => {
				// Filter out @version (existing behavior)
				if (key === '@version') return false;
				// Filter out conditions that match current discriminator context
				// Strip leading '/' from key for root-level property references
				const normalizedKey = key.startsWith('/') ? key.slice(1) : key;
				if (discriminatorContext?.[normalizedKey] !== undefined) {
					const showValues = values;
					// If the discriminator value is in the show list, this is redundant
					if (showValues.includes(discriminatorContext[normalizedKey])) return false;
				}
				return true;
			});
			if (filteredShow.length > 0) {
				const showConditions = filteredShow
					.map(([key, values]) => `${key}: [${values.map((v) => JSON.stringify(v)).join(', ')}]`)
					.join(', ');
				lines.push(` * @displayOptions.show { ${showConditions} }`);
			}
		}
		if (prop.displayOptions.hide && Object.keys(prop.displayOptions.hide).length > 0) {
			const filteredHide = Object.entries(prop.displayOptions.hide).filter(([key, values]) => {
				// Filter out @version (existing behavior)
				if (key === '@version') return false;
				// Filter out conditions that match current discriminator context
				// Strip leading '/' from key for root-level property references
				const normalizedKey = key.startsWith('/') ? key.slice(1) : key;
				if (discriminatorContext?.[normalizedKey] !== undefined) {
					const hideValues = values;
					// If the discriminator value is in the hide list, this is redundant
					if (hideValues.includes(discriminatorContext[normalizedKey])) return false;
				}
				return true;
			});
			if (filteredHide.length > 0) {
				const hideConditions = filteredHide
					.map(([key, values]) => `${key}: [${values.map((v) => JSON.stringify(v)).join(', ')}]`)
					.join(', ');
				lines.push(` * @displayOptions.hide { ${hideConditions} }`);
			}
		}
	}

	// Default value - skip multi-line strings to avoid breaking JSDoc comments
	if (prop.default !== undefined && prop.default !== null && prop.default !== '') {
		let defaultStr: string;
		if (typeof prop.default === 'object') {
			defaultStr = JSON.stringify(prop.default);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-base-to-string -- Object case handled above
			defaultStr = String(prop.default);
		}
		if (!defaultStr.includes('\n')) {
			lines.push(` * @default ${defaultStr}`);
		}
	}

	lines.push(' */');
	return lines.join('\n');
}

/**
 * Generate JSDoc comment for a node type
 */
export function generateNodeJSDoc(node: NodeTypeDescription): string {
	const lines: string[] = ['/**'];
	lines.push(` * ${node.displayName} Node Types`);
	lines.push(' *');

	if (node.description) {
		lines.push(` * ${node.description}`);
	}

	// Check if this is an AI subnode
	const subnodeType = getSubnodeOutputType(node);
	if (subnodeType) {
		lines.push(` * @subnodeType ${subnodeType}`);
	}

	lines.push(' */');

	return lines.join('\n');
}

/**
 * Generate a single property line for an interface
 */
export function generatePropertyLine(
	prop: NodeProperty,
	optional: boolean,
	discriminatorContext?: DiscriminatorCombination,
): string {
	const tsType = mapPropertyType(prop, discriminatorContext);
	if (!tsType) {
		return ''; // Skip this property
	}

	const lines: string[] = [];

	// JSDoc - generate if description, displayOptions, hint, builderHint, or non-trivial default exists
	// This ensures LLMs can see dependency information even for properties without descriptions
	/* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- Logical OR for boolean combination */
	const hasDisplayOptions =
		prop.displayOptions &&
		((prop.displayOptions.show && Object.keys(prop.displayOptions.show).length > 0) ||
			(prop.displayOptions.hide && Object.keys(prop.displayOptions.hide).length > 0));
	/* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
	if (prop.description || hasDisplayOptions || prop.hint || prop.builderHint) {
		lines.push(generatePropertyJSDoc(prop, discriminatorContext));
	}

	// Property name (quote if reserved word, has spaces, or other invalid chars)
	let propName = prop.name;
	const needsQuoting = RESERVED_WORDS.has(propName) || !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(propName);
	if (needsQuoting) {
		// Escape any quotes in the property name
		propName = `'${propName.replace(/'/g, "\\'")}'`;
	}

	const optionalMarker = optional ? '?' : '';
	lines.push(`${INDENT}${propName}${optionalMarker}: ${tsType};`);

	return lines.join(`\n${INDENT}`);
}

// =============================================================================
// Version Handling
// =============================================================================

/**
 * Group nodes by their properties (versions with identical props grouped together)
 */
export function groupVersionsByProperties(nodes: NodeTypeDescription[]): VersionGroup[] {
	const groups: VersionGroup[] = [];

	for (const node of nodes) {
		const versions = Array.isArray(node.version) ? node.version : [node.version];
		const propsHash = JSON.stringify(node.properties.map((p) => p.name).sort());

		// Find existing group with same properties
		const existing = groups.find(
			(g) => JSON.stringify(g.properties.map((p) => p.name).sort()) === propsHash,
		);

		if (existing) {
			existing.versions.push(...versions);
			existing.highestVersion = Math.max(existing.highestVersion, ...versions);
		} else {
			groups.push({
				versions,
				highestVersion: Math.max(...versions),
				properties: node.properties,
			});
		}
	}

	return groups;
}

/**
 * Get the highest version from a version spec
 */
export function getHighestVersion(version: number | number[]): number {
	if (Array.isArray(version)) {
		return Math.max(...version);
	}
	return version;
}

/**
 * Convert version number to valid TypeScript identifier
 */
export function versionToTypeName(version: number): string {
	return `V${String(version).replace('.', '')}`;
}

// =============================================================================
// File Generation
// =============================================================================

/**
 * Convert node name to valid file name
 */
export function nodeNameToFileName(nodeName: string): string {
	// n8n-nodes-base.httpRequest -> httpRequest
	// @n8n/n8n-nodes-langchain.lmChatOpenAi -> lmChatOpenAi
	const parts = nodeName.split('.');
	return parts[parts.length - 1];
}

/**
 * Get package name from node type
 */
export function getPackageName(nodeName: string): string {
	// n8n-nodes-base.httpRequest -> n8n-nodes-base
	// @n8n/n8n-nodes-langchain.agent -> n8n-nodes-langchain
	const parts = nodeName.split('.');
	const pkg = parts[0];
	// Handle @n8n/ prefix
	if (pkg.startsWith('@n8n/')) {
		return pkg.replace('@n8n/', '');
	}
	return pkg;
}

/**
 * Get base node name without package prefix
 */
function getNodeBaseName(nodeName: string): string {
	const parts = nodeName.split('.');
	return parts[parts.length - 1];
}

/**
 * Get package prefix for type names (to avoid conflicts)
 */
function getPackagePrefix(nodeName: string): string {
	const pkg = getPackageName(nodeName);
	if (pkg === 'n8n-nodes-base') {
		return ''; // No prefix for main package
	}
	// For langchain nodes, add 'Lc' prefix
	if (pkg.includes('langchain')) {
		return 'Lc';
	}
	return '';
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
	return str
		.replace(/[-_]+/g, ' ')
		.replace(/\./g, ' ')
		.split(' ')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join('');
}

/**
 * Convert string to snake_case (lowercase with underscores)
 * Used for folder/file naming in split type structure
 */
function toSnakeCase(str: string): string {
	return str
		.replace(/([A-Z])/g, '_$1')
		.toLowerCase()
		.replace(/^_/, '')
		.replace(/[-\s]+/g, '_');
}

/**
 * Build discriminator path from a combination
 * Examples:
 *   { resource: 'ticket', operation: 'get' } -> 'resource_ticket/operation_get'
 *   { mode: 'runOnceForAllItems' } -> 'mode_run_once_for_all_items'
 *   { authentication: 'oauth2' } -> 'authentication_oauth2'
 */
export function buildDiscriminatorPath(combo: DiscriminatorCombination): string {
	const parts: string[] = [];

	// Handle resource/operation pattern (nested directories)
	if (combo.resource && combo.operation) {
		parts.push(`resource_${toSnakeCase(combo.resource)}`);
		parts.push(`operation_${toSnakeCase(combo.operation)}`);
		return parts.join('/');
	}

	// Handle single discriminators (flat files)
	for (const [key, value] of Object.entries(combo)) {
		if (value !== undefined) {
			parts.push(`${key}_${toSnakeCase(value)}`);
		}
	}

	return parts.join('/');
}

/**
 * Check if a node uses ANY discriminator pattern that benefits from splitting
 * Only returns true for: resource/operation, mode
 * Does NOT split for: trigger, authentication, agent, promptType (these don't benefit from splitting)
 */
export function hasDiscriminatorPattern(node: NodeTypeDescription): boolean {
	const combinations = extractDiscriminatorCombinations(node);
	if (combinations.length === 0) {
		return false;
	}

	// Check the first combination to see what kind of discriminators it has
	const first = combinations[0];

	// Resource/operation pattern
	if (first.resource !== undefined && first.operation !== undefined) {
		return true;
	}

	// Mode pattern
	if (first.mode !== undefined) {
		return true;
	}

	// Other discriminators don't benefit from splitting
	return false;
}

/**
 * Represents the discriminator tree structure for a node version
 * Used for generating index files at different levels
 */
export interface DiscriminatorTree {
	/** Type of discriminator pattern: 'resource_operation' or 'single' (mode, auth, etc.) */
	type: 'resource_operation' | 'single';
	/** For resource_operation: map of resource -> operations */
	resources?: Map<string, string[]>;
	/** For single discriminators: discriminator name and its values */
	discriminatorName?: string;
	discriminatorValues?: string[];
}

/**
 * Build a discriminator tree from combinations
 */
export function buildDiscriminatorTree(
	combinations: DiscriminatorCombination[],
): DiscriminatorTree {
	if (combinations.length === 0) {
		return { type: 'single' };
	}

	const first = combinations[0];

	// Resource/operation pattern
	if (first.resource !== undefined && first.operation !== undefined) {
		const resources = new Map<string, string[]>();
		for (const combo of combinations) {
			if (combo.resource && combo.operation) {
				if (!resources.has(combo.resource)) {
					resources.set(combo.resource, []);
				}
				resources.get(combo.resource)!.push(combo.operation);
			}
		}
		return { type: 'resource_operation', resources };
	}

	// Single discriminator pattern
	const discName = Object.keys(first).find((k) => first[k] !== undefined);
	if (discName) {
		const values = combinations.map((c) => c[discName]!).filter(Boolean);
		return {
			type: 'single',
			discriminatorName: discName,
			discriminatorValues: [...new Set(values)],
		};
	}

	return { type: 'single' };
}

/**
 * Generate the _shared.ts file for a split version directory
 * Contains credentials, base type, and helper types shared across all discriminator files
 *
 * @param node The node type description
 * @param version The specific version number
 * @param importDepth How many levels deep (for import paths)
 */
export function generateSharedFile(
	node: NodeTypeDescription,
	version: number,
	_importDepth: number = 5,
): string {
	const prefix = getPackagePrefix(node.name);
	const nodeName = prefix + toPascalCase(getNodeBaseName(node.name));
	const isTrigger = isTriggerNode(node);
	const versionSuffix = versionToTypeName(version);

	// Filter properties for this version
	const filteredProperties = filterPropertiesForVersion(node.properties, version);

	const lines: string[] = [];

	// Header
	lines.push('/**');
	lines.push(` * ${node.displayName} Node - Version ${version} - Shared Types`);
	lines.push(' * ');
	lines.push(' * Contains credentials, base type, and helper types shared across all');
	lines.push(' * resource/operation combinations.');
	lines.push(' */');
	lines.push('');
	lines.push('');

	// Check properties
	const outputProps = filteredProperties.filter(
		(p) => !['notice', 'curlImport', 'credentials'].includes(p.type),
	);

	// Helper types
	const needsFilter = outputProps.some((p) => p.type === 'filter');
	const needsAssignment = outputProps.some((p) => p.type === 'assignmentCollection');

	if (needsFilter || needsAssignment) {
		lines.push('// Helper types for special n8n fields');
		if (needsFilter) {
			lines.push(generateFilterTypeDeclaration(true));
		}
		if (needsAssignment) {
			lines.push(generateAssignmentTypeDeclarations(true));
		}
		lines.push('');
	}

	const credTypeName =
		node.credentials && node.credentials.length > 0
			? `${nodeName}${versionSuffix}Credentials`
			: undefined;

	if (node.credentials && node.credentials.length > 0) {
		lines.push(`export interface ${credTypeName} {`);
		const seenCreds = new Set<string>();
		for (const cred of node.credentials) {
			if (seenCreds.has(cred.name)) continue;
			seenCreds.add(cred.name);
			const optional = !cred.required ? '?' : '';
			lines.push(`${INDENT}${cred.name}${optional}: CredentialReference;`);
		}

		// Add generic auth credentials if node supports genericAuthType
		const hasGenericAuthType = node.properties.some(
			(p) => p.name === 'genericAuthType' && p.type === 'credentialsSelect',
		);
		if (hasGenericAuthType) {
			lines.push(
				`${INDENT}/** Generic auth credentials - set the 'genericAuthType' config parameter to select which one to use */`,
			);
			for (const credName of GENERIC_AUTH_TYPE_VALUES) {
				if (!seenCreds.has(credName)) {
					seenCreds.add(credName);
					lines.push(`${INDENT}${credName}?: CredentialReference;`);
				}
			}
		}

		lines.push('}');
		lines.push('');
	}

	const baseTypeName = `${nodeName}${versionSuffix}NodeBase`;
	lines.push(`export interface ${baseTypeName} {`);
	lines.push(`${INDENT}type: '${node.name}';`);
	lines.push(`${INDENT}version: ${version};`);
	if (credTypeName) {
		lines.push(`${INDENT}credentials?: ${credTypeName};`);
	}
	if (isTrigger) {
		lines.push(`${INDENT}isTrigger: true;`);
	}
	lines.push('}');

	return lines.join('\n');
}

/**
 * Generate a discriminator file for a single resource/operation (or mode, etc.) combination
 *
 * @param node The node type description
 * @param version The specific version number
 * @param combo The discriminator combination (e.g., { resource: 'ticket', operation: 'get' })
 * @param props Properties applicable to this combination
 * @param schema Optional JSON schema for output type
 * @param sharedImportPath Relative path to _shared.ts
 */
export function generateDiscriminatorFile(
	node: NodeTypeDescription,
	version: number,
	combo: DiscriminatorCombination,
	props: NodeProperty[],
	schema?: JsonSchema,
	_importDepth: number = 5,
): string {
	const prefix = getPackagePrefix(node.name);
	const nodeName = prefix + toPascalCase(getNodeBaseName(node.name));
	const versionSuffix = versionToTypeName(version);
	const isTrigger = isTriggerNode(node);

	// Build type name from discriminator values
	const comboValues = Object.entries(combo)
		.filter(([_, v]) => v !== undefined)
		.map(([_, v]) => toPascalCase(v!));
	const comboSuffix = comboValues.join('');
	const configName = `${nodeName}${versionSuffix}${comboSuffix}Params`;
	const outputTypeName = `${nodeName}${versionSuffix}${comboSuffix}Output`;
	const nodeTypeName = `${nodeName}${versionSuffix}${comboSuffix}Node`;

	// Extract AI input types for subnode configuration (use builderHint if available)
	const aiInputTypes = extractAIInputTypesFromBuilderHint(node, combo);
	const subnodeConfigTypeName =
		aiInputTypes.length > 0 ? `${nodeName}${versionSuffix}${comboSuffix}SubnodeConfig` : undefined;

	const lines: string[] = [];

	// Build description from discriminator values
	const comboDesc = Object.entries(combo)
		.filter(([_, v]) => v !== undefined)
		.map(([k, v]) => `${k}=${v}`)
		.join(', ');

	// Header
	lines.push('/**');
	lines.push(` * ${node.displayName} Node - Version ${version}`);
	lines.push(` * Discriminator: ${comboDesc}`);
	lines.push(' */');
	lines.push('');
	lines.push('');

	// Check what helper types we need
	const needsFilter = props.some((p) => p.type === 'filter');
	const needsAssignment = props.some((p) => p.type === 'assignmentCollection');

	// Inline helper types (only the ones needed)
	if (needsFilter || needsAssignment) {
		lines.push('// Helper types for special n8n fields');
		if (needsFilter) {
			lines.push(generateFilterTypeDeclaration(false));
		}
		if (needsAssignment) {
			lines.push(generateAssignmentTypeDeclarations(false));
		}
		lines.push('');
	}

	// Inline credentials interface (if node has credentials)
	if (node.credentials && node.credentials.length > 0) {
		lines.push('interface Credentials {');
		const seenCreds = new Set<string>();
		for (const cred of node.credentials) {
			if (seenCreds.has(cred.name)) continue;
			seenCreds.add(cred.name);
			const optional = !cred.required ? '?' : '';
			lines.push(`${INDENT}${cred.name}${optional}: CredentialReference;`);
		}

		// Add generic auth credentials if node supports genericAuthType
		const hasGenericAuthType = node.properties.some(
			(p) => p.name === 'genericAuthType' && p.type === 'credentialsSelect',
		);
		if (hasGenericAuthType) {
			lines.push(
				`${INDENT}/** Generic auth credentials - set the 'genericAuthType' config parameter to select which one to use */`,
			);
			for (const credName of GENERIC_AUTH_TYPE_VALUES) {
				if (!seenCreds.has(credName)) {
					seenCreds.add(credName);
					lines.push(`${INDENT}${credName}?: CredentialReference;`);
				}
			}
		}
		lines.push('}');
		lines.push('');
	}

	// Find description for JSDoc from discriminator option
	let description: string | undefined;
	for (const [key, value] of Object.entries(combo)) {
		if (value === undefined) continue;
		const discProp = node.properties.find(
			(p) => p.name === key && p.options?.some((o) => o.value === value),
		);
		if (discProp) {
			description = discProp.options?.find((o) => o.value === value)?.description;
			if (description) break;
		}
	}

	if (description) {
		lines.push(`/** ${description} */`);
	}
	lines.push(`export type ${configName} = {`);

	// Add discriminator fields
	for (const [key, value] of Object.entries(combo)) {
		if (value !== undefined) {
			lines.push(`${INDENT}${key}: '${value}';`);
		}
	}

	// Add properties
	const seenNames = new Set<string>();
	for (const prop of props) {
		if (seenNames.has(prop.name)) continue;
		seenNames.add(prop.name);
		// Pass combo as discriminator context to filter redundant displayOptions
		const propLine = generatePropertyLine(prop, isPropertyOptional(prop), combo);
		if (propLine) {
			lines.push(propLine);
		}
	}

	lines.push('};');
	lines.push('');

	// Output type (if schema provided)
	if (schema) {
		lines.push(`export type ${outputTypeName} = ${jsonSchemaToTypeScript(schema)};`);
		lines.push('');
	}

	// Subnode Configuration (if AI inputs exist)
	if (subnodeConfigTypeName && aiInputTypes.length > 0) {
		const subnodeConfigCode = generateNarrowedSubnodeConfig(
			aiInputTypes,
			nodeName,
			versionSuffix,
			comboSuffix,
		);
		if (subnodeConfigCode) {
			lines.push(subnodeConfigCode);
			lines.push('');
		}
	}

	lines.push(`export type ${nodeTypeName} = {`);
	lines.push(`${INDENT}type: '${node.name}';`);
	lines.push(`${INDENT}version: ${version};`);
	if (node.credentials && node.credentials.length > 0) {
		lines.push(`${INDENT}credentials?: Credentials;`);
	}
	if (isTrigger) {
		lines.push(`${INDENT}isTrigger: true;`);
	}
	// Include subnodes in config if AI inputs exist
	// subnodes field is required if any AI input type is required
	const hasRequiredSubnodes = aiInputTypes.some((input) => input.required);
	const subnodeOptionalMark = hasRequiredSubnodes ? '' : '?';
	const configType = subnodeConfigTypeName
		? `NodeConfig<${configName}> & { subnodes${subnodeOptionalMark}: ${subnodeConfigTypeName} }`
		: `NodeConfig<${configName}>`;
	lines.push(`${INDENT}config: ${configType};`);
	if (schema) {
		lines.push(`${INDENT}output?: Items<${outputTypeName}>;`);
	}
	lines.push('};');

	return lines.join('\n');
}

/**
 * Generate index file for a resource directory (e.g., resource_ticket/index.ts)
 * Re-exports all operation files within this resource
 *
 * @param node The node type description
 * @param version The specific version number
 * @param resource The resource name
 * @param operations Array of operation names for this resource
 */
export function generateResourceIndexFile(
	node: NodeTypeDescription,
	version: number,
	resource: string,
	operations: string[],
): string {
	const prefix = getPackagePrefix(node.name);
	const nodeName = prefix + toPascalCase(getNodeBaseName(node.name));
	const versionSuffix = versionToTypeName(version);

	const lines: string[] = [];

	lines.push('/**');
	lines.push(` * ${node.displayName} - ${toPascalCase(resource)} Resource`);
	lines.push(' * Re-exports all operation types for this resource.');
	lines.push(' */');
	lines.push('');

	// Import node types for union
	const nodeTypeNames: string[] = [];
	for (const op of operations.sort()) {
		const fileName = `operation_${toSnakeCase(op)}`;
		const nodeTypeName = `${nodeName}${versionSuffix}${toPascalCase(resource)}${toPascalCase(op)}Node`;
		nodeTypeNames.push(nodeTypeName);
		lines.push(`import type { ${nodeTypeName} } from './${fileName}';`);
	}
	lines.push('');

	// Re-export all operations
	for (const op of operations.sort()) {
		const fileName = `operation_${toSnakeCase(op)}`;
		lines.push(`export * from './${fileName}';`);
	}
	lines.push('');

	// Union type for this resource's nodes
	const resourceNodeTypeName = `${nodeName}${versionSuffix}${toPascalCase(resource)}Node`;
	if (nodeTypeNames.length === 1) {
		lines.push(`export type ${resourceNodeTypeName} = ${nodeTypeNames[0]};`);
	} else {
		lines.push(`export type ${resourceNodeTypeName} =`);
		for (const typeName of nodeTypeNames) {
			lines.push(`${INDENT}| ${typeName}`);
		}
		lines.push(`${INDENT};`);
	}

	return lines.join('\n');
}

/**
 * Generate version-level index file for split structure (e.g., v1/index.ts)
 * Re-exports _shared.ts and all discriminator directories
 *
 * @param node The node type description
 * @param version The specific version number
 * @param tree The discriminator tree structure
 */
export function generateSplitVersionIndexFile(
	node: NodeTypeDescription,
	version: number,
	tree: DiscriminatorTree,
): string {
	const prefix = getPackagePrefix(node.name);
	const nodeName = prefix + toPascalCase(getNodeBaseName(node.name));
	const versionSuffix = versionToTypeName(version);

	const lines: string[] = [];

	lines.push('/**');
	lines.push(` * ${node.displayName} Node - Version ${version}`);
	lines.push(' * Re-exports all discriminator combinations.');
	lines.push(' */');
	lines.push('');

	// Collect all node type names for the union
	const nodeTypeNames: string[] = [];

	if (tree.type === 'resource_operation' && tree.resources) {
		// Import resource node types for union
		for (const [resource] of tree.resources) {
			const resourceNodeTypeName = `${nodeName}${versionSuffix}${toPascalCase(resource)}Node`;
			nodeTypeNames.push(resourceNodeTypeName);
			const resourceDir = `resource_${toSnakeCase(resource)}`;
			lines.push(`import type { ${resourceNodeTypeName} } from './${resourceDir}';`);
		}
		lines.push('');

		// Re-export resource directories
		for (const [resource] of tree.resources) {
			const resourceDir = `resource_${toSnakeCase(resource)}`;
			lines.push(`export * from './${resourceDir}';`);
		}
		lines.push('');
	} else if (tree.type === 'single' && tree.discriminatorName && tree.discriminatorValues) {
		// Single discriminator pattern (mode, etc.)
		const discName = tree.discriminatorName;

		// Import node types
		for (const value of tree.discriminatorValues.sort()) {
			const fileName = `${discName}_${toSnakeCase(value)}`;
			const nodeTypeName = `${nodeName}${versionSuffix}${toPascalCase(value)}Node`;
			nodeTypeNames.push(nodeTypeName);
			lines.push(`import type { ${nodeTypeName} } from './${fileName}';`);
		}
		lines.push('');

		// Re-export discriminator files
		for (const value of tree.discriminatorValues.sort()) {
			const fileName = `${discName}_${toSnakeCase(value)}`;
			lines.push(`export * from './${fileName}';`);
		}
		lines.push('');
	}

	// Generate the combined node type union
	const nodeTypeName = `${nodeName}${versionSuffix}Node`;
	if (nodeTypeNames.length === 1) {
		lines.push(`export type ${nodeTypeName} = ${nodeTypeNames[0]};`);
	} else if (nodeTypeNames.length > 1) {
		lines.push(`export type ${nodeTypeName} =`);
		for (const typeName of nodeTypeNames) {
			lines.push(`${INDENT}| ${typeName}`);
		}
		lines.push(`${INDENT};`);
	}

	return lines.join('\n');
}

/**
 * Plan the file structure for a split version directory
 * Returns a Map of relative file paths to their content
 * This separates the file structure planning from actual filesystem writing
 *
 * @param node The node type description
 * @param version The specific version number
 * @returns Map of relative path -> file content
 */
export function planSplitVersionFiles(
	node: NodeTypeDescription,
	version: number,
): Map<string, string> {
	const files = new Map<string, string>();

	// Get discriminator combinations
	const combinations = extractDiscriminatorCombinations(node);
	const tree = buildDiscriminatorTree(combinations);

	// Discover output schemas for this node/version
	const outputSchemas = discoverSchemasForNode(node.name, version, node.schemaPath);

	// No _shared.ts - each discriminator file is self-contained

	if (tree.type === 'resource_operation' && tree.resources) {
		// Resource/operation pattern: nested directories
		for (const [resource, operations] of tree.resources) {
			const resourceDir = `resource_${toSnakeCase(resource)}`;

			// Generate operation files within resource directory
			for (const operation of operations) {
				// Skip Custom API Call operations - they don't have fixed schemas
				if (isCustomApiCall(operation)) continue;

				const combo = { resource, operation };
				// Filter properties by version before getting combination-specific props
				const versionFilteredProps = filterPropertiesForVersion(node.properties, version);
				const nodeForCombination = { ...node, properties: versionFilteredProps };
				const props = getPropertiesForCombination(nodeForCombination, combo);
				const fileName = `operation_${toSnakeCase(operation)}.ts`;
				const filePath = `${resourceDir}/${fileName}`;

				// Find matching output schema for this resource/operation
				const matchingSchema = findSchemaForOperation(outputSchemas, resource, operation);

				// Import depth: 6 levels deep (node/version/resource_x/operation.ts -> base)
				const content = generateDiscriminatorFile(
					node,
					version,
					combo,
					props,
					matchingSchema?.schema,
					6,
				);
				files.set(filePath, content);
			}

			// Generate resource index file (filter out Custom API Call operations)
			const filteredOperations = operations.filter((op) => !isCustomApiCall(op));
			const resourceIndexContent = generateResourceIndexFile(
				node,
				version,
				resource,
				filteredOperations,
			);
			files.set(`${resourceDir}/index.ts`, resourceIndexContent);
		}
	} else if (tree.type === 'single' && tree.discriminatorName && tree.discriminatorValues) {
		// Single discriminator pattern (mode, etc.): flat files
		const discName = tree.discriminatorName;

		for (const value of tree.discriminatorValues) {
			const combo: DiscriminatorCombination = { [discName]: value };
			// Filter properties by version before getting combination-specific props
			const versionFilteredProps = filterPropertiesForVersion(node.properties, version);
			const nodeForCombination = { ...node, properties: versionFilteredProps };
			const props = getPropertiesForCombination(nodeForCombination, combo);
			const fileName = `${discName}_${toSnakeCase(value)}.ts`;

			// Import depth: 5 levels deep (node/version/mode.ts -> base)
			const content = generateDiscriminatorFile(node, version, combo, props, undefined, 5);
			files.set(fileName, content);
		}
	}

	// Generate version index file
	files.set('index.ts', generateSplitVersionIndexFile(node, version, tree));

	// Generate Zod schema files alongside type files
	const schemaFiles = planSplitVersionSchemaFiles(node, version);
	for (const [path, content] of schemaFiles) {
		files.set(path, content);
	}

	return files;
}

/**
 * Check if node is a trigger (no main input)
 */
function isTriggerNode(node: NodeTypeDescription): boolean {
	const inputs = node.inputs;
	if (Array.isArray(inputs)) {
		if (inputs.length === 0) return true;
		if (typeof inputs[0] === 'string') {
			return !(inputs as string[]).includes('main');
		}
		return !inputs.some((i) => typeof i === 'object' && i.type === 'main');
	}
	return false;
}

/**
 * Convert version number to valid filename (lowercase)
 */
export function versionToFileName(version: number): string {
	return `v${String(version).replace('.', '')}`;
}

/**
 * Generate type file for a single specific version of a node
 * This creates files like v3.ts, v31.ts, v34.ts containing only that version's types
 * Properties are filtered to only include those that apply to the specific version
 *
 * The generated file includes:
 * - Config types for each resource/operation combination
 * - Output types (from JSON schemas if available)
 * - Individual node types pairing each config with its specific output
 * - A union type of all node types for type narrowing
 *
 * @param node The node type description
 * @param specificVersion The specific version number to generate for
 */
export function generateSingleVersionTypeFile(
	node: NodeTypeDescription,
	specificVersion: number,
): string {
	const prefix = getPackagePrefix(node.name);
	const nodeName = prefix + toPascalCase(getNodeBaseName(node.name));
	const isTrigger = isTriggerNode(node);
	const versionSuffix = versionToTypeName(specificVersion);

	// Filter properties to only include those that apply to this specific version
	const filteredProperties = filterPropertiesForVersion(node.properties, specificVersion);

	// Create a filtered node description for use in type generation
	const filteredNode: NodeTypeDescription = {
		...node,
		properties: filteredProperties,
		version: specificVersion, // Single version for this file
	};

	// Discover output schemas for this node/version
	const outputSchemas = discoverSchemasForNode(node.name, specificVersion, node.schemaPath);

	const lines: string[] = [];

	// Header with JSDoc
	lines.push('/**');
	lines.push(` * ${node.displayName} Node - Version ${specificVersion}`);
	if (node.description) {
		lines.push(` * ${node.description}`);
	}
	lines.push(' */');
	lines.push('');
	lines.push('');

	// Extract AI input types for narrowed subnode config (use builderHint if available)
	const aiInputTypes = extractAIInputTypesFromBuilderHint(node);
	const subnodeConfigTypeName =
		aiInputTypes.length > 0 ? `${nodeName}${versionSuffix}SubnodeConfig` : undefined;

	// Check filtered properties that will actually be output
	const outputProps = filteredProperties.filter(
		(p) => !['notice', 'curlImport', 'credentials'].includes(p.type),
	);

	// Helper types (if needed) based on filtered properties
	const needsFilter = outputProps.some((p) => p.type === 'filter');
	const needsAssignment = outputProps.some((p) => p.type === 'assignmentCollection');

	if (needsFilter || needsAssignment) {
		lines.push('// Helper types for special n8n fields');
		if (needsFilter) {
			lines.push(generateFilterTypeDeclaration(false));
		}
		if (needsAssignment) {
			lines.push(generateAssignmentTypeDeclarations(false));
		}
		lines.push('');
	}

	// Use filtered node for discriminated union generation
	const unionResult = generateDiscriminatedUnionForEntry(filteredNode, nodeName, versionSuffix);
	lines.push(unionResult.code);
	lines.push('');

	// Map from config type name to output type name (only populated when schema exists)
	const configToOutputType = new Map<string, string>();

	// Collect output types that have schemas
	const outputTypesToGenerate: Array<{ typeName: string; schema: JsonSchema }> = [];

	for (const configInfo of unionResult.configTypes) {
		// Try to find matching schema
		let matchingSchema =
			configInfo.resource && configInfo.operation
				? findSchemaForOperation(outputSchemas, configInfo.resource, configInfo.operation)
				: undefined;

		// Fallback for nodes without resource/operation discriminators:
		// use root-level schema files (resource === '')
		if (!matchingSchema && !configInfo.resource && !configInfo.operation) {
			matchingSchema = outputSchemas.find((s) => s.resource === '');
		}

		if (matchingSchema) {
			// Generate output type name by replacing 'Params' with 'Output'
			let outputTypeName = configInfo.typeName.replace(/Params$/, 'Output');
			// Handle case where type name doesn't end with Params (simple interface)
			if (outputTypeName === configInfo.typeName) {
				outputTypeName = `${configInfo.typeName}Output`;
			}

			outputTypesToGenerate.push({ typeName: outputTypeName, schema: matchingSchema.schema });
			configToOutputType.set(configInfo.typeName, outputTypeName);
		}
		// If no schema found, don't add to map - output field will be omitted
	}

	// Only generate Output Types section if there are schemas
	if (outputTypesToGenerate.length > 0) {
		for (const { typeName, schema } of outputTypesToGenerate) {
			lines.push(`export type ${typeName} = ${jsonSchemaToTypeScript(schema)};`);
			lines.push('');
		}
	}

	// Subnode Config section (for AI nodes)
	if (subnodeConfigTypeName) {
		const subnodeConfigCode = generateNarrowedSubnodeConfig(aiInputTypes, nodeName, versionSuffix);
		if (subnodeConfigCode) {
			lines.push(subnodeConfigCode);
			lines.push('');
		}
	}

	const credTypeName =
		node.credentials && node.credentials.length > 0
			? `${nodeName}${versionSuffix}Credentials`
			: undefined;

	if (node.credentials && node.credentials.length > 0) {
		lines.push(`export interface ${credTypeName} {`);
		const seenCreds = new Set<string>();
		for (const cred of node.credentials) {
			if (seenCreds.has(cred.name)) continue;
			seenCreds.add(cred.name);
			const optional = !cred.required ? '?' : '';
			lines.push(`${INDENT}${cred.name}${optional}: CredentialReference;`);
		}

		// Add generic auth credentials if node supports genericAuthType
		const hasGenericAuthType = node.properties.some(
			(p) => p.name === 'genericAuthType' && p.type === 'credentialsSelect',
		);
		if (hasGenericAuthType) {
			lines.push(
				`${INDENT}/** Generic auth credentials - set the 'genericAuthType' config parameter to select which one to use */`,
			);
			for (const credName of GENERIC_AUTH_TYPE_VALUES) {
				if (!seenCreds.has(credName)) {
					seenCreds.add(credName);
					lines.push(`${INDENT}${credName}?: CredentialReference;`);
				}
			}
		}

		lines.push('}');
		lines.push('');
	}

	// Generate base type with common fields to avoid repetition
	const baseTypeName = `${nodeName}${versionSuffix}NodeBase`;
	lines.push(`interface ${baseTypeName} {`);
	lines.push(`${INDENT}type: '${node.name}';`);
	lines.push(`${INDENT}version: ${specificVersion};`);
	if (credTypeName) {
		lines.push(`${INDENT}credentials?: ${credTypeName};`);
	}
	if (isTrigger) {
		lines.push(`${INDENT}isTrigger: true;`);
	}
	lines.push('}');
	lines.push('');

	// Generate individual node types pairing each config with its output (if available)
	// Using explicit named types for LLM clarity and self-documentation
	const individualNodeTypes: string[] = [];

	for (const configInfo of unionResult.configTypes) {
		const outputTypeName = configToOutputType.get(configInfo.typeName);
		// Generate individual node type name from config type
		const individualTypeName = configInfo.typeName.replace(/Config$/, 'Node');
		// Handle case where type name doesn't end with Config
		const finalTypeName =
			individualTypeName === configInfo.typeName
				? `${configInfo.typeName}Node`
				: individualTypeName;

		individualNodeTypes.push(finalTypeName);

		lines.push(`export type ${finalTypeName} = ${baseTypeName} & {`);
		// Include narrowed subnode config in the NodeConfig if available
		// subnodes field is required if any AI input type is required
		if (subnodeConfigTypeName) {
			const hasRequiredSubnodes = aiInputTypes.some((input) => input.required);
			const subnodeOptionalMark = hasRequiredSubnodes ? '' : '?';
			lines.push(
				`${INDENT}config: NodeConfig<${configInfo.typeName}> & { subnodes${subnodeOptionalMark}: ${subnodeConfigTypeName} };`,
			);
		} else {
			lines.push(`${INDENT}config: NodeConfig<${configInfo.typeName}>;`);
		}
		if (outputTypeName) {
			lines.push(`${INDENT}output?: Items<${outputTypeName}>;`);
		}
		lines.push('};');
		lines.push('');
	}

	// Generate union type of all individual node types
	const nodeTypeName = `${nodeName}${versionSuffix}Node`;

	if (individualNodeTypes.length === 1) {
		// Single node type - just export as alias
		lines.push(`export type ${nodeTypeName} = ${individualNodeTypes[0]};`);
	} else if (individualNodeTypes.length > 1) {
		// Multiple node types - create union
		lines.push(`export type ${nodeTypeName} =`);
		for (let i = 0; i < individualNodeTypes.length; i++) {
			lines.push(`${INDENT}| ${individualNodeTypes[i]}`);
		}
		lines.push(`${INDENT};`);
	} else {
		// No config types - shouldn't happen, but handle gracefully
		lines.push(`export type ${nodeTypeName} = ${baseTypeName} & {`);
		lines.push(`${INDENT}config: NodeConfig<Record<string, unknown>>;`);
		lines.push('};');
	}

	return lines.join('\n');
}

/**
 * Generate index file for a node directory that re-exports all individual versions
 * Creates files like set/index.ts that exports from v3.ts, v31.ts, v34.ts and creates union type
 * @param node A sample node description (used for display name and name)
 * @param versions Array of individual version numbers to include
 */
export function generateVersionIndexFile(
	node: NodeTypeDescription,
	versions: number[],
	splitVersions: Set<number> = new Set(),
): string {
	const prefix = getPackagePrefix(node.name);
	const typeName = prefix + toPascalCase(getNodeBaseName(node.name));

	// Sort by version descending (highest first)
	const sortedVersions = [...versions].sort((a, b) => b - a);

	const lines: string[] = [];

	lines.push('/**');
	lines.push(` * ${node.displayName} Node Types`);
	lines.push(' *');
	lines.push(' * Re-exports all version-specific types and provides combined union type.');
	lines.push(' */');
	lines.push('');

	// Import node types from each version file/directory for use in union type
	const nodeTypeNames: string[] = [];
	for (const version of sortedVersions) {
		const fileName = versionToFileName(version);
		const versionSuffix = versionToTypeName(version);
		const nodeTypeName = `${typeName}${versionSuffix}Node`;
		nodeTypeNames.push(nodeTypeName);

		// For split versions, import from directory index; for flat versions, import from file
		const importPath = splitVersions.has(version) ? `./${fileName}` : `./${fileName}`;
		lines.push(`import type { ${nodeTypeName} } from '${importPath}';`);
	}
	lines.push('');

	// Re-export from each version file/directory
	for (const version of sortedVersions) {
		const fileName = versionToFileName(version);
		// Both flat files and directories use the same export syntax
		// TypeScript resolves ./v1 to either ./v1.ts or ./v1/index.ts
		lines.push(`export * from './${fileName}';`);
		// Note: Schema files (.schema.js) are CommonJS JavaScript loaded at runtime via require(),
		// not TypeScript exports. They are not re-exported from this index file.
	}
	lines.push('');

	// Generate combined union type
	lines.push('// Combined union type for all versions');
	lines.push(`export type ${typeName}Node = ${nodeTypeNames.join(' | ')};`);

	return lines.join('\n');
}

/**
 * Generate complete type file for a single node (or multiple version entries of the same node)
 * @deprecated Use generateSingleVersionTypeFile and generateVersionIndexFile instead
 */
export function generateNodeTypeFile(nodes: NodeTypeDescription | NodeTypeDescription[]): string {
	// Handle single node for backwards compatibility
	const nodeArray = Array.isArray(nodes) ? nodes : [nodes];
	const node = nodeArray[0]; // Use first node for metadata
	const prefix = getPackagePrefix(node.name);
	const nodeName = prefix + toPascalCase(getNodeBaseName(node.name));
	const isTrigger = isTriggerNode(node);

	// Collect all versions across all entries
	const allVersions: number[] = [];
	for (const n of nodeArray) {
		const versions = Array.isArray(n.version) ? n.version : [n.version];
		allVersions.push(...versions);
	}

	const lines: string[] = [];

	// Header with JSDoc
	lines.push(generateNodeJSDoc(node));
	lines.push('');
	lines.push('');

	// Check properties that will actually be output (skip notice, curlImport, etc.) across all node entries
	const outputProps = nodeArray.flatMap((n) =>
		n.properties.filter((p) => !['notice', 'curlImport', 'credentials'].includes(p.type)),
	);

	// Helper types (if needed) - only add if they'll actually be used in output
	const needsFilter = outputProps.some((p) => p.type === 'filter');
	const needsAssignment = outputProps.some((p) => p.type === 'assignmentCollection');

	if (needsFilter || needsAssignment) {
		lines.push('// Helper types for special n8n fields');
		if (needsFilter) {
			lines.push(generateFilterTypeDeclaration(false));
		}
		if (needsAssignment) {
			lines.push(generateAssignmentTypeDeclarations(false));
		}
		lines.push('');
	}

	// Note: fixedCollection types are represented as Record<string, unknown>
	// to avoid naming conflicts across nodes with different structures

	// Generate discriminated union or simple interface for each node entry
	// Sort by highest version descending so newest is first
	const sortedNodes = [...nodeArray].sort((a, b) => {
		const aHighest = getHighestVersion(a.version);
		const bHighest = getHighestVersion(b.version);
		return bHighest - aHighest;
	});

	for (const n of sortedNodes) {
		const entryVersion = getHighestVersion(n.version);
		const entryVersionSuffix = versionToTypeName(entryVersion);
		const unionResult = generateDiscriminatedUnionForEntry(n, nodeName, entryVersionSuffix);
		lines.push(unionResult.code);
		lines.push('');
	}

	// Collect all credentials from all node entries
	const allCredentials: Array<{ name: string; required?: boolean }> = [];
	const seenCreds = new Set<string>();
	for (const n of nodeArray) {
		if (n.credentials) {
			for (const cred of n.credentials) {
				if (!seenCreds.has(cred.name)) {
					seenCreds.add(cred.name);
					allCredentials.push(cred);
				}
			}
		}
	}

	for (const n of sortedNodes) {
		const entryVersion = getHighestVersion(n.version);
		const entryVersionSuffix = versionToTypeName(entryVersion);

		if (n.credentials && n.credentials.length > 0) {
			lines.push(`export interface ${nodeName}${entryVersionSuffix}Credentials {`);
			const seenCreds = new Set<string>();
			for (const cred of n.credentials) {
				if (seenCreds.has(cred.name)) continue;
				seenCreds.add(cred.name);
				const optional = !cred.required ? '?' : '';
				lines.push(`${INDENT}${cred.name}${optional}: CredentialReference;`);
			}

			// Add generic auth credentials if node supports genericAuthType
			const hasGenericAuthType = n.properties.some(
				(p) => p.name === 'genericAuthType' && p.type === 'credentialsSelect',
			);
			if (hasGenericAuthType) {
				lines.push(
					`${INDENT}/** Generic auth credentials - set the 'genericAuthType' config parameter to select which one to use */`,
				);
				for (const credName of GENERIC_AUTH_TYPE_VALUES) {
					if (!seenCreds.has(credName)) {
						seenCreds.add(credName);
						lines.push(`${INDENT}${credName}?: CredentialReference;`);
					}
				}
			}

			lines.push('}');
			lines.push('');
		}
	}

	const nodeTypeNames: string[] = [];

	for (const n of sortedNodes) {
		const entryVersion = getHighestVersion(n.version);
		const entryVersionSuffix = versionToTypeName(entryVersion);
		const versions = Array.isArray(n.version) ? n.version : [n.version];
		const versionUnion = versions
			.sort((a, b) => a - b)
			.map((v) => String(v))
			.join(' | ');

		const nodeTypeName = `${nodeName}${entryVersionSuffix}Node`;
		nodeTypeNames.push(nodeTypeName);

		const credType =
			n.credentials && n.credentials.length > 0
				? `${nodeName}${entryVersionSuffix}Credentials`
				: 'Record<string, never>';

		lines.push(`export type ${nodeTypeName} = {`);
		lines.push(`${INDENT}type: '${n.name}';`);
		lines.push(`${INDENT}version: ${versionUnion};`);
		lines.push(`${INDENT}config: NodeConfig<${nodeName}${entryVersionSuffix}Params>;`);
		lines.push(`${INDENT}credentials?: ${credType};`);

		if (isTrigger) {
			lines.push(`${INDENT}isTrigger: true;`);
		}

		lines.push('};');
		lines.push('');
	}

	// Generate union type for all node versions (for backwards compatibility)
	lines.push(`export type ${nodeName}Node = ${nodeTypeNames.join(' | ')};`);

	return lines.join('\n');
}

/**
 * Generate discriminated union for a specific node entry with a given version suffix
 * Returns structured result with config type info for linking with output types
 */
function generateDiscriminatedUnionForEntry(
	node: NodeTypeDescription,
	nodeName: string,
	versionSuffix: string,
): DiscriminatedUnionResult {
	const combinations = extractDiscriminatorCombinations(node);
	const lines: string[] = [];
	const configTypes: ConfigTypeInfo[] = [];

	if (combinations.length === 0) {
		// No discriminators - generate simple interface
		const configName = `${nodeName}${versionSuffix}Params`;
		lines.push(`export interface ${configName} {`);

		// Merge duplicate collection properties (e.g., multiple 'options' collections with different displayOptions)
		const mergedProps = mergeCollectionProperties(node.properties);
		for (const prop of mergedProps) {
			const propLine = generatePropertyLine(prop, isPropertyOptional(prop));
			if (propLine) {
				lines.push(propLine);
			}
		}

		lines.push('}');

		// Single config type with no discriminators
		configTypes.push({
			typeName: configName,
			discriminators: {},
		});

		return {
			code: lines.join('\n'),
			configTypes,
		};
	}

	// Generate individual config types for each combination
	// Include version suffix to avoid duplicate type names when multiple versions exist
	const configTypeNames: string[] = [];

	for (const combo of combinations) {
		// Build config name from all discriminator values + version suffix
		const comboValues = Object.entries(combo)
			.filter(([_, v]) => v !== undefined)
			.map(([_, v]) => toPascalCase(v!));
		const configName = `${nodeName}${versionSuffix}${comboValues.join('')}Params`;
		configTypeNames.push(configName);

		// Track config info for linking with output types
		const configInfo: ConfigTypeInfo = {
			typeName: configName,
			resource: combo.resource,
			operation: combo.operation,
			discriminators: {},
		};
		for (const [key, value] of Object.entries(combo)) {
			if (value !== undefined) {
				configInfo.discriminators[key] = value;
			}
		}
		configTypes.push(configInfo);

		// Get properties for this combination
		const props = getPropertiesForCombination(node, combo);

		// Find description for JSDoc from any discriminator property
		let description: string | undefined;
		for (const [key, value] of Object.entries(combo)) {
			if (value === undefined) continue;
			const discProp = node.properties.find(
				(p) => p.name === key && p.options?.some((o) => o.value === value),
			);
			if (discProp) {
				description = discProp.options?.find((o) => o.value === value)?.description;
				if (description) break;
			}
		}

		if (description) {
			lines.push(`/** ${description} */`);
		}

		lines.push(`export type ${configName} = {`);

		// Add discriminator fields
		for (const [key, value] of Object.entries(combo)) {
			if (value !== undefined) {
				lines.push(`${INDENT}${key}: '${value}';`);
			}
		}

		// Track seen property names to avoid duplicates
		const seenNames = new Set<string>();
		for (const prop of props) {
			if (seenNames.has(prop.name)) {
				continue; // Skip duplicate property names
			}
			seenNames.add(prop.name);
			// Pass combo as discriminator context to filter redundant displayOptions
			const propLine = generatePropertyLine(prop, isPropertyOptional(prop), combo);
			if (propLine) {
				lines.push(propLine);
			}
		}

		lines.push('};');
		lines.push('');
	}

	return {
		code: lines.join('\n'),
		configTypes,
	};
}

/**
 * Generate index file with re-exports
 */
export function generateIndexFile(nodes: NodeTypeDescription[]): string {
	const lines: string[] = [];

	lines.push('/**');
	lines.push(' * Generated Node Types');
	lines.push(' *');
	lines.push(' * This file is auto-generated by scripts/generate-types.ts');
	lines.push(' * Do not edit manually.');
	lines.push(' *');
	lines.push(' * To regenerate:');
	lines.push(' *   pnpm generate-types');
	lines.push(' */');
	lines.push('');

	// Group nodes by package
	const byPackage = new Map<string, NodeTypeDescription[]>();
	for (const node of nodes) {
		const pkg = getPackageName(node.name);
		if (!byPackage.has(pkg)) {
			byPackage.set(pkg, []);
		}
		byPackage.get(pkg)!.push(node);
	}

	// Import all node types for use in AllNodeTypes union (must be at top)
	// (export * re-exports but doesn't bring into scope)
	lines.push('// Import node types for AllNodeTypes union');
	const sortedNodes = [...nodes].sort((a, b) => a.name.localeCompare(b.name));
	for (const [pkg, pkgNodes] of byPackage) {
		const sortedPkgNodes = pkgNodes.sort((a, b) => a.name.localeCompare(b.name));
		// Import each node type from its file
		for (const node of sortedPkgNodes) {
			const fileName = nodeNameToFileName(node.name);
			const prefix = getPackagePrefix(node.name);
			const nodeName = prefix + toPascalCase(getNodeBaseName(node.name));
			lines.push(`import type { ${nodeName}Node } from './nodes/${pkg}/${fileName}';`);
		}
	}
	lines.push('');

	// Generate exports by package
	for (const [pkg, pkgNodes] of byPackage) {
		lines.push(`// ${pkg}`);
		for (const node of pkgNodes.sort((a, b) => a.name.localeCompare(b.name))) {
			const fileName = nodeNameToFileName(node.name);
			lines.push(`export * from './nodes/${pkg}/${fileName}';`);
		}
		lines.push('');
	}

	// Generate KnownNodeType union (string literal union of all node type names)
	lines.push('// Combined type union of node type strings');
	lines.push('export type KnownNodeType =');
	for (let i = 0; i < nodes.length; i++) {
		lines.push(`${INDENT}| '${nodes[i].name}'`);
	}
	lines.push(`${INDENT};`);
	lines.push('');

	// Generate AllNodeTypes union (union of all *Node types for use with NodeFn)
	lines.push('// Union of all node input types for type-safe node() function');
	lines.push('export type AllNodeTypes =');
	for (let i = 0; i < sortedNodes.length; i++) {
		const node = sortedNodes[i];
		const prefix = getPackagePrefix(node.name);
		const nodeName = prefix + toPascalCase(getNodeBaseName(node.name));
		lines.push(`${INDENT}| ${nodeName}Node`);
	}
	lines.push(`${INDENT};`);

	return lines.join('\n');
}

// =============================================================================
// Subnode Union Type Generation
// =============================================================================

/**
 * AI subnode output types and their corresponding union type names and factory functions
 */
const AI_SUBNODE_TYPES: Array<{
	outputType: string;
	unionTypeName: string;
	factoryName: string;
}> = [
	{
		outputType: 'ai_languageModel',
		unionTypeName: 'ValidLanguageModelType',
		factoryName: 'languageModel',
	},
	{ outputType: 'ai_memory', unionTypeName: 'ValidMemoryType', factoryName: 'memory' },
	{ outputType: 'ai_tool', unionTypeName: 'ValidToolType', factoryName: 'tool' },
	{
		outputType: 'ai_outputParser',
		unionTypeName: 'ValidOutputParserType',
		factoryName: 'outputParser',
	},
	{ outputType: 'ai_embedding', unionTypeName: 'ValidEmbeddingType', factoryName: 'embedding' },
	{
		outputType: 'ai_vectorStore',
		unionTypeName: 'ValidVectorStoreType',
		factoryName: 'vectorStore',
	},
	{ outputType: 'ai_retriever', unionTypeName: 'ValidRetrieverType', factoryName: 'retriever' },
	{
		outputType: 'ai_document',
		unionTypeName: 'ValidDocumentLoaderType',
		factoryName: 'documentLoader',
	},
	{
		outputType: 'ai_textSplitter',
		unionTypeName: 'ValidTextSplitterType',
		factoryName: 'textSplitter',
	},
];

// =============================================================================
// AI Input Type Extraction and Narrowed Subnode Config Generation
// =============================================================================

export interface AIInputTypeInfo {
	type: string;
	required: boolean;
	displayOptions?: {
		show?: Record<string, unknown[]>;
		hide?: Record<string, unknown[]>;
	};
}

// Types for builderHint.inputs
interface BuilderHintInput {
	required?: boolean;
	displayOptions?: {
		show?: Record<string, unknown[]>;
		hide?: Record<string, unknown[]>;
	};
}

interface NodeBuilderHint {
	inputs?: Record<string, BuilderHintInput>;
}

/**
 * Extract AI input types from a node definition.
 * Handles both static array inputs and dynamic expression inputs.
 *
 * @param node The node type description
 * @returns Array of AI input types with required status (e.g., [{ type: 'ai_languageModel', required: true }])
 */
export function extractAIInputTypes(node: NodeTypeDescription): AIInputTypeInfo[] {
	const inputs = node.inputs;
	// Use Map to track type -> required status (true if ANY input of that type is required)
	const aiTypes: Map<string, boolean> = new Map();

	// Handle string inputs (expression format like "={{ ... }}")
	if (typeof inputs === 'string') {
		// Extract ai_* types from the expression string using regex
		// For expression inputs, we also try to extract required status
		const aiTypeRegex = /["']ai_(\w+)["']/g;
		let match;
		while ((match = aiTypeRegex.exec(inputs)) !== null) {
			const aiType = `ai_${match[1]}`;
			// Check if this type has required: true in the expression
			// Look for pattern like: { type: "ai_languageModel", ... required: true }
			const requiredRegex = new RegExp(
				`\\{[^}]*type:\\s*["']${aiType}["'][^}]*required:\\s*true[^}]*\\}`,
				'g',
			);
			const isRequired = requiredRegex.test(inputs);
			// Only update if not already set to true (any required input makes it required)
			if (!aiTypes.has(aiType) || isRequired) {
				aiTypes.set(aiType, isRequired);
			}
		}
		return [...aiTypes.entries()].map(([type, required]) => ({ type, required }));
	}

	// Handle array inputs
	if (!Array.isArray(inputs)) {
		return [];
	}

	for (const input of inputs) {
		let inputType: string | undefined;
		let isRequired = false;

		if (typeof input === 'string') {
			inputType = input;
		} else if (typeof input === 'object' && input !== null && 'type' in input) {
			inputType = input.type;
			// Extract required status from object input
			if ('required' in input && input.required === true) {
				isRequired = true;
			}
		}

		// Only include AI input types (starting with 'ai_')
		if (inputType?.startsWith('ai_')) {
			// If any input of this type is required, mark it as required
			const existingRequired = aiTypes.get(inputType) ?? false;
			aiTypes.set(inputType, existingRequired || isRequired);
		}
	}

	return [...aiTypes.entries()].map(([type, required]) => ({ type, required }));
}

/**
 * Extract AI input types from builderHint.inputs when available.
 * Falls back to extractAIInputTypes when no builderHint is present.
 *
 * This function:
 * - Uses builderHint.inputs for explicit subnode configuration
 * - Filters subnodes based on discriminator combo (mode, resource, operation)
 * - Strips discriminator keys from displayOptions (they're used for filtering)
 * - Preserves non-discriminator displayOptions for JSDoc generation
 *
 * @param node The node type description
 * @param combo Optional discriminator combination for filtering
 * @returns Array of AI input types with required status and displayOptions
 */
export function extractAIInputTypesFromBuilderHint(
	node: NodeTypeDescription,
	combo?: DiscriminatorCombination,
): AIInputTypeInfo[] {
	// builderHint is an extended property not yet in the official type definition
	const nodeWithBuilderHint = node as NodeTypeDescription & { builderHint?: NodeBuilderHint };
	const builderHint = nodeWithBuilderHint.builderHint;
	if (!builderHint?.inputs) {
		// Fall back to existing extraction, but mark all as optional
		// since we can't reliably determine required status from expressions
		return extractAIInputTypes(node).map((input) => ({
			...input,
			required: false,
		}));
	}

	const result: AIInputTypeInfo[] = [];

	for (const [inputType, config] of Object.entries(builderHint.inputs)) {
		if (!inputType.startsWith('ai_')) continue;

		// Check if this input applies to the current discriminator combo
		if (combo && config.displayOptions?.show) {
			let applies = true;
			for (const [key, values] of Object.entries(config.displayOptions.show)) {
				if (DISCRIMINATOR_FIELDS.includes(key) && combo[key as keyof DiscriminatorCombination]) {
					// This is a discriminator check
					const comboValue = combo[key as keyof DiscriminatorCombination];
					if (!values.includes(comboValue)) {
						applies = false;
						break;
					}
				}
			}
			if (!applies) continue;
		}

		// Determine if required (default to false for safety)
		const isRequired = config.required === true;

		// Extract non-discriminator displayOptions for JSDoc
		const nonDiscriminatorOptions = getNonDiscriminatorDisplayOptions(config.displayOptions);

		const aiInput: AIInputTypeInfo = {
			type: inputType,
			required: isRequired,
		};

		// Only add displayOptions if there are non-discriminator ones
		if (nonDiscriminatorOptions) {
			aiInput.displayOptions = nonDiscriminatorOptions;
		}

		result.push(aiInput);
	}

	return result;
}

/**
 * Extract non-discriminator displayOptions from a displayOptions object.
 * Discriminators (mode, resource, operation) are stripped as they're used for filtering.
 */
function getNonDiscriminatorDisplayOptions(
	displayOptions?: BuilderHintInput['displayOptions'],
): AIInputTypeInfo['displayOptions'] | undefined {
	if (!displayOptions) return undefined;

	const result: AIInputTypeInfo['displayOptions'] = {};

	if (displayOptions.show) {
		const filteredShow: Record<string, unknown[]> = {};
		for (const [key, values] of Object.entries(displayOptions.show)) {
			if (!DISCRIMINATOR_FIELDS.includes(key)) {
				filteredShow[key] = values;
			}
		}
		if (Object.keys(filteredShow).length > 0) {
			result.show = filteredShow;
		}
	}

	if (displayOptions.hide) {
		const filteredHide: Record<string, unknown[]> = {};
		for (const [key, values] of Object.entries(displayOptions.hide)) {
			if (!DISCRIMINATOR_FIELDS.includes(key)) {
				filteredHide[key] = values;
			}
		}
		if (Object.keys(filteredHide).length > 0) {
			result.hide = filteredHide;
		}
	}

	// Return undefined if empty
	if (!result.show && !result.hide) {
		return undefined;
	}

	return result;
}

/**
 * Format displayOptions as a JSDoc annotation string.
 * Format: @displayOptions.show { key: [values] }
 */
function formatSubnodeDisplayOptionsAsJSDoc(
	displayOptions: AIInputTypeInfo['displayOptions'],
): string | undefined {
	if (!displayOptions) return undefined;

	const parts: string[] = [];

	if (displayOptions.show && Object.keys(displayOptions.show).length > 0) {
		const showObj = Object.entries(displayOptions.show)
			.map(([key, values]) => `${key}: ${JSON.stringify(values)}`)
			.join(', ');
		parts.push(`@displayOptions.show { ${showObj} }`);
	}

	if (displayOptions.hide && Object.keys(displayOptions.hide).length > 0) {
		const hideObj = Object.entries(displayOptions.hide)
			.map(([key, values]) => `${key}: ${JSON.stringify(values)}`)
			.join(', ');
		parts.push(`@displayOptions.hide { ${hideObj} }`);
	}

	return parts.length > 0 ? parts.join(`\n${INDENT} * `) : undefined;
}

/**
 * Generate a narrowed SubnodeConfig interface for a node based on its accepted AI input types.
 *
 * @param aiInputTypes Array of AI input types with required status
 * @param nodeName The node name (PascalCase, e.g., 'LcAgent')
 * @param versionSuffix The version suffix (e.g., 'V31')
 * @param comboSuffix Optional suffix for discriminator combinations (e.g., 'RetrieveAsTool')
 * @returns TypeScript interface code, or null if no AI inputs
 */
export function generateNarrowedSubnodeConfig(
	aiInputTypes: AIInputTypeInfo[],
	nodeName: string,
	versionSuffix: string,
	comboSuffix: string = '',
): string | null {
	if (aiInputTypes.length === 0) {
		return null;
	}

	const lines: string[] = [];
	const interfaceName = `${nodeName}${versionSuffix}${comboSuffix}SubnodeConfig`;

	lines.push(`export interface ${interfaceName} {`);

	for (const aiInput of aiInputTypes) {
		const fieldInfo = AI_TYPE_TO_SUBNODE_FIELD[aiInput.type];
		if (!fieldInfo) {
			continue;
		}

		let typeStr: string;
		if (fieldInfo.isArray) {
			typeStr = `${fieldInfo.instanceType}[]`;
		} else if (fieldInfo.canBeMultiple) {
			typeStr = `${fieldInfo.instanceType} | ${fieldInfo.instanceType}[]`;
		} else {
			typeStr = fieldInfo.instanceType;
		}

		// Add JSDoc comment for displayOptions if present
		if (aiInput.displayOptions) {
			const displayOptionsJSDoc = formatSubnodeDisplayOptionsAsJSDoc(aiInput.displayOptions);
			if (displayOptionsJSDoc) {
				lines.push(`${INDENT}/**`);
				lines.push(`${INDENT} * ${displayOptionsJSDoc}`);
				lines.push(`${INDENT} */`);
			}
		}

		// Mark field as optional only if not required
		const optional = aiInput.required ? '' : '?';
		lines.push(`${INDENT}${fieldInfo.fieldName}${optional}: ${typeStr};`);
	}

	lines.push('}');

	return lines.join('\n');
}

/**
 * Get the instance type imports needed for a set of AI input types.
 *
 * @param aiInputTypes Array of AI input types
 * @returns Array of instance type names to import
 */
export function getSubnodeInstanceTypeImports(aiInputTypes: AIInputTypeInfo[]): string[] {
	const imports: string[] = [];

	for (const aiInput of aiInputTypes) {
		const fieldInfo = AI_TYPE_TO_SUBNODE_FIELD[aiInput.type];
		if (fieldInfo && !imports.includes(fieldInfo.instanceType)) {
			imports.push(fieldInfo.instanceType);
		}
	}

	return imports;
}

/**
 * Extract output types from a node definition
 * @param node The node type description
 * @returns Array of output type strings (e.g., ['main'], ['ai_languageModel'])
 */
export function extractOutputTypes(node: NodeTypeDescription): string[] {
	const outputs = node.outputs;
	if (!Array.isArray(outputs)) {
		return [];
	}

	const outputTypes: string[] = [];
	for (const output of outputs) {
		if (typeof output === 'string') {
			outputTypes.push(output);
		} else if (typeof output === 'object' && output !== null && 'type' in output) {
			outputTypes.push(output.type);
		}
	}

	return outputTypes;
}

/**
 * Group nodes by their output types
 * @param nodes Array of node type descriptions
 * @returns Map of output type to array of node names
 */
export function groupNodesByOutputType(nodes: NodeTypeDescription[]): Record<string, string[]> {
	const grouped: Record<string, string[]> = {};

	for (const node of nodes) {
		const outputTypes = extractOutputTypes(node);
		for (const outputType of outputTypes) {
			if (!grouped[outputType]) {
				grouped[outputType] = [];
			}
			if (!grouped[outputType].includes(node.name)) {
				grouped[outputType].push(node.name);
			}
		}
	}

	return grouped;
}

/**
 * Generate union types for all AI subnode categories
 * @param nodes Array of node type descriptions
 * @returns TypeScript code with union type definitions
 */
export function generateSubnodeUnionTypes(nodes: NodeTypeDescription[]): string {
	const grouped = groupNodesByOutputType(nodes);
	const lines: string[] = [];

	for (const { outputType, unionTypeName, factoryName } of AI_SUBNODE_TYPES) {
		const nodeNames = grouped[outputType] ?? [];

		// JSDoc comment
		lines.push('/**');
		lines.push(` * Union of all valid ${outputType.replace('ai_', '')} node types.`);
		lines.push(` * Use with ${factoryName}() factory for type-safe subnode creation.`);
		lines.push(' */');

		if (nodeNames.length === 0) {
			// Empty category - use never type
			lines.push(`export type ${unionTypeName} = never;`);
		} else {
			// Generate union of literal types
			lines.push(`export type ${unionTypeName} =`);
			for (let i = 0; i < nodeNames.length; i++) {
				lines.push(`${INDENT}| '${nodeNames[i]}'`);
			}
			lines.push(`${INDENT};`);
		}

		lines.push('');
	}

	return lines.join('\n');
}

/**
 * Generate the complete subnodes.ts file with all union types
 * @param nodes Array of node type descriptions
 * @returns Complete TypeScript file content
 */
export function generateSubnodesFile(nodes: NodeTypeDescription[]): string {
	const lines: string[] = [];

	// File header
	lines.push('/**');
	lines.push(' * Generated Subnode Union Types');
	lines.push(' *');
	lines.push(' * This file is auto-generated by scripts/generate-types.ts');
	lines.push(' * Do not edit manually.');
	lines.push(' *');
	lines.push(' * These union types define valid node types for each subnode category.');
	lines.push(' * Use with the corresponding factory functions for type-safe subnode creation.');
	lines.push(' */');
	lines.push('');

	// Add union types
	lines.push(generateSubnodeUnionTypes(nodes));

	return lines.join('\n');
}

/**
 * Get the primary AI subnode output type for a node (if any)
 * @param node The node type description
 * @returns The AI subnode output type (e.g., 'ai_languageModel') or undefined
 */
export function getSubnodeOutputType(node: NodeTypeDescription): string | undefined {
	const outputTypes = extractOutputTypes(node);
	for (const outputType of outputTypes) {
		if (AI_SUBNODE_TYPES.some((t) => t.outputType === outputType)) {
			return outputType;
		}
	}
	return undefined;
}

// =============================================================================
// Node Loading
// =============================================================================

/**
 * Load node types from JSON file
 * @param jsonPath Path to the nodes.json file
 * @param packageName Package name to prefix node names with (e.g., 'n8n-nodes-base')
 */
export async function loadNodeTypes(
	jsonPath: string,
	packageName?: string,
): Promise<NodeTypeDescription[]> {
	const content = await fs.promises.readFile(jsonPath, 'utf-8');
	let nodes: NodeTypeDescription[];
	try {
		nodes = JSON.parse(content) as NodeTypeDescription[];
	} catch (error) {
		throw new Error(
			`Failed to parse node types from ${jsonPath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	// If package name provided and node names don't have package prefix, add it
	if (packageName) {
		for (const node of nodes) {
			if (!node.name.includes('.')) {
				node.name = `${packageName}.${node.name}`;
			}
		}
	}

	return nodes;
}

/**
 * Convert a node to its tool variant.
 * Mirrors the logic from cli/src/load-nodes-and-credentials.ts convertNodeToAiTool()
 *
 * Tool variants:
 * - Have name ending with 'Tool'
 * - Have displayName ending with ' Tool'
 * - Have outputs set to ai_tool
 * - Have toolDescription property added (with required: true and default from node description)
 *
 * @param node The base node to convert
 * @returns The tool variant node, or null if node is not usable as tool
 */
function convertNodeToToolVariant(node: NodeTypeDescription): NodeTypeDescription | null {
	if (!node.usableAsTool) {
		return null;
	}

	// Deep copy to avoid mutating original
	const toolNode: NodeTypeDescription = deepCopy(node);

	// Update name and displayName
	toolNode.name = toolNode.name + 'Tool';
	toolNode.displayName = toolNode.displayName + ' Tool';

	// Set outputs to ai_tool
	toolNode.outputs = [{ type: 'ai_tool', displayName: 'Tool' }];

	// Clear inputs (tools don't have main input)
	toolNode.inputs = [];

	// Remove usableAsTool flag
	delete toolNode.usableAsTool;

	// Add toolDescription property if not already present
	const hasToolDescription = toolNode.properties.some((p) => p.name === 'toolDescription');
	if (!hasToolDescription) {
		const hasResource = toolNode.properties.some((p) => p.name === 'resource');
		const hasOperation = toolNode.properties.some((p) => p.name === 'operation');

		// Create toolDescription property
		const toolDescriptionProp: NodeProperty = {
			displayName: 'Description',
			name: 'toolDescription',
			type: 'string',
			default: toolNode.description ?? '',
			required: true,
			description:
				'Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often',
		};

		// If node has resource/operation, add descriptionType selector and displayOptions
		if (hasResource || hasOperation) {
			const descriptionTypeProp: NodeProperty = {
				displayName: 'Tool Description',
				name: 'descriptionType',
				type: 'options',
				options: [
					{
						name: 'Set Automatically',
						value: 'auto',
						description: 'Automatically set based on resource and operation',
					},
					{
						name: 'Set Manually',
						value: 'manual',
						description: 'Manually set the description',
					},
				],
				default: 'auto',
			};

			// Add displayOptions to toolDescription
			toolDescriptionProp.displayOptions = {
				show: {
					descriptionType: ['manual'],
				},
			};

			// Insert at beginning of properties (after any notice/callout)
			const firstNonNoticeIdx = toolNode.properties.findIndex((p) => p.type !== 'notice');
			const insertIdx = firstNonNoticeIdx >= 0 ? firstNonNoticeIdx : 0;
			toolNode.properties.splice(insertIdx, 0, descriptionTypeProp, toolDescriptionProp);
		} else {
			// Insert toolDescription at beginning
			const firstNonNoticeIdx = toolNode.properties.findIndex((p) => p.type !== 'notice');
			const insertIdx = firstNonNoticeIdx >= 0 ? firstNonNoticeIdx : 0;
			toolNode.properties.splice(insertIdx, 0, toolDescriptionProp);
		}
	}

	return toolNode;
}

// =============================================================================
// Main Entry Point
// =============================================================================

/** Batch size for parallel file writes to avoid file descriptor exhaustion */
const WRITE_BATCH_SIZE = 100;

/**
 * Write files in parallel batches to stay within OS file descriptor limits.
 */
async function writeFilesInBatches(files: Array<{ path: string; content: string }>): Promise<void> {
	for (let i = 0; i < files.length; i += WRITE_BATCH_SIZE) {
		const batch = files.slice(i, i + WRITE_BATCH_SIZE);
		// eslint-disable-next-line @typescript-eslint/promise-function-async
		await Promise.all(batch.map((f) => fs.promises.writeFile(f.path, f.content)));
	}
}

/**
 * Generate version-specific type files for a package
 * Creates directory structure: nodes/{package}/{nodeName}/v{version}.ts (or v{version}/) and index.ts
 * Each individual version gets its own file or directory (for split structure) with filtered properties
 *
 * For nodes with resource/operation or mode discriminators, creates split structure:
 *   v1/
 *     _shared.ts
 *     index.ts
 *     resource_ticket/
 *       operation_get.ts
 *       ...
 *
 * For nodes without discriminators, creates flat files:
 *   v1.ts
 *   v2.ts
 */
async function generateVersionSpecificFiles(
	packageDir: string,
	_packageName: string,
	nodesByName: Map<string, NodeTypeDescription[]>,
): Promise<NodeTypeDescription[]> {
	const allNodes: NodeTypeDescription[] = [];

	// Phase 1: Pure computation — generate all file contents in memory
	const allDirs = new Set<string>();
	const allWrites: Array<{ path: string; content: string }> = [];
	// Track split plans that need their own directory creation + writes
	const splitPlans: Array<{ baseDir: string; plan: Map<string, string> }> = [];

	for (const [nodeName, nodes] of nodesByName) {
		try {
			const nodeDir = path.join(packageDir, nodeName);

			// Accumulate writes locally — only commit to allWrites on success
			const nodeWrites: Array<{ path: string; content: string }> = [];
			const nodeDirs = new Set<string>([nodeDir]);
			const nodeSplitPlans: Array<{ baseDir: string; plan: Map<string, string> }> = [];

			const versionToNode = new Map<number, NodeTypeDescription>();
			const allVersions: number[] = [];
			const splitVersionsSet = new Set<number>();

			for (const node of nodes) {
				const versions = Array.isArray(node.version) ? node.version : [node.version];
				for (const version of versions) {
					if (!versionToNode.has(version)) {
						versionToNode.set(version, node);
						allVersions.push(version);
					}
				}
			}

			for (const version of allVersions) {
				const sourceNode = versionToNode.get(version)!;
				const fileName = versionToFileName(version);

				if (hasDiscriminatorPattern(sourceNode)) {
					const versionDir = path.join(nodeDir, fileName);
					const plan = planSplitVersionFiles(sourceNode, version);
					nodeSplitPlans.push({ baseDir: versionDir, plan });
					splitVersionsSet.add(version);
				} else {
					const content = generateSingleVersionTypeFile(sourceNode, version);
					nodeWrites.push({ path: path.join(nodeDir, `${fileName}.ts`), content });

					const schemaContent = generateSingleVersionSchemaFile(sourceNode, version);
					nodeWrites.push({
						path: path.join(nodeDir, `${fileName}.schema.js`),
						content: schemaContent,
					});
				}
			}

			const indexContent = generateVersionIndexFile(nodes[0], allVersions, splitVersionsSet);
			nodeWrites.push({ path: path.join(nodeDir, 'index.ts'), content: indexContent });

			// Commit: all generation succeeded for this node, merge into global arrays
			allWrites.push(...nodeWrites);
			for (const d of nodeDirs) allDirs.add(d);
			splitPlans.push(...nodeSplitPlans);
			allNodes.push(nodes[0]);
		} catch (error) {
			console.error(`  Error generating ${nodeName}:`, error);
		}
	}

	// Collect directories from split plans
	for (const { baseDir, plan } of splitPlans) {
		for (const [relativePath, content] of plan) {
			const fullPath = path.join(baseDir, relativePath);
			allDirs.add(path.dirname(fullPath));
			allWrites.push({ path: fullPath, content });
		}
	}

	// Phase 2: Create all directories in parallel
	// eslint-disable-next-line @typescript-eslint/promise-function-async
	await Promise.all([...allDirs].map((d) => fs.promises.mkdir(d, { recursive: true })));

	// Phase 3: Write all files in parallel batches
	await writeFilesInBatches(allWrites);

	return allNodes;
}

// =============================================================================
// Orchestration - Reusable generation logic
// =============================================================================

export interface GenerationOptions {
	nodes: NodeTypeDescription[];
	outputDir: string;
}

export interface GenerationResult {
	nodeCount: number;
}

/**
 * Orchestrate generation of node definition files (types + schemas) for a set of nodes.
 * This is the core reusable function used by both the dev-time script and build-time CLI.
 *
 * @param options.nodes - Array of node type descriptions to generate for
 * @param options.outputDir - Directory to write generated files to
 * @returns Result with count of nodes processed
 */
export async function orchestrateGeneration(options: GenerationOptions): Promise<GenerationResult> {
	const { nodes, outputDir } = options;

	// Group nodes by package, filtering hidden
	const nodesByPackage = new Map<string, Map<string, NodeTypeDescription[]>>();

	for (const node of nodes) {
		if (node.hidden) continue;

		const packageName = getPackageName(node.name);
		const fileName = nodeNameToFileName(node.name);

		if (!nodesByPackage.has(packageName)) {
			nodesByPackage.set(packageName, new Map());
		}

		const packageNodes = nodesByPackage.get(packageName)!;
		if (!packageNodes.has(fileName)) {
			packageNodes.set(fileName, []);
		}
		packageNodes.get(fileName)!.push(node);
	}

	const allNodes: NodeTypeDescription[] = [];

	// Generate files for each package, cleaning stale output first
	for (const [packageName, nodesByName] of nodesByPackage) {
		const packageDir = path.join(outputDir, 'nodes', packageName);
		await fs.promises.rm(packageDir, { recursive: true, force: true });
		const packageNodes = await generateVersionSpecificFiles(packageDir, packageName, nodesByName);
		allNodes.push(...packageNodes);
	}

	// Generate root index file
	if (allNodes.length > 0) {
		const indexContent = generateIndexFile(allNodes);
		await fs.promises.writeFile(path.join(outputDir, 'index.ts'), indexContent);
	}

	return { nodeCount: allNodes.length };
}

/**
 * Generate all types (dev-time script entry point).
 * Loads nodes from built packages and generates to the default output path.
 */
export async function generateTypes(): Promise<void> {
	console.log('Starting type generation...');

	const allNodes: NodeTypeDescription[] = [];

	// Load nodes-base
	if (fs.existsSync(NODES_BASE_TYPES)) {
		console.log(`Loading nodes from ${NODES_BASE_TYPES}...`);
		const nodesBase = await loadNodeTypes(NODES_BASE_TYPES, 'n8n-nodes-base');
		console.log(`  Found ${nodesBase.length} node entries in nodes-base`);
		allNodes.push(...groupAndAddToolVariants(nodesBase));
	} else {
		console.log(`Warning: ${NODES_BASE_TYPES} not found. Run 'pnpm build' in nodes-base first.`);
	}

	// Load nodes-langchain
	if (fs.existsSync(NODES_LANGCHAIN_TYPES)) {
		console.log(`Loading nodes from ${NODES_LANGCHAIN_TYPES}...`);
		const nodesLangchain = await loadNodeTypes(NODES_LANGCHAIN_TYPES, '@n8n/n8n-nodes-langchain');
		console.log(`  Found ${nodesLangchain.length} node entries in nodes-langchain`);
		allNodes.push(...groupAndAddToolVariants(nodesLangchain));
	} else {
		console.log(
			`Warning: ${NODES_LANGCHAIN_TYPES} not found. Run 'pnpm build' in nodes-langchain first.`,
		);
	}

	const result = await orchestrateGeneration({ nodes: allNodes, outputDir: DEV_OUTPUT_PATH });

	if (result.nodeCount === 0) {
		// Generate placeholder if no nodes found
		const placeholderContent = `/**
 * Generated Node Types
 *
 * This file is auto-generated by scripts/generate-types.ts
 * Do not edit manually.
 *
 * No nodes were found. Run 'pnpm build' in nodes-base and nodes-langchain first.
 *
 * @generated
 */

export {};
`;
		await fs.promises.writeFile(path.join(DEV_OUTPUT_PATH, 'index.ts'), placeholderContent);
		console.log('Generated placeholder index.ts (no nodes found)');
	} else {
		console.log(`Generated definitions for ${result.nodeCount} nodes`);
	}

	console.log('Type generation complete!');
}

/**
 * Takes raw loaded nodes and returns a flat array with tool variants added.
 * Filters hidden nodes.
 */
function groupAndAddToolVariants(nodes: NodeTypeDescription[]): NodeTypeDescription[] {
	const result: NodeTypeDescription[] = [];
	for (const node of nodes) {
		if (node.hidden) continue;
		result.push(node);

		const toolVariant = convertNodeToToolVariant(node);
		if (toolVariant) {
			result.push(toolVariant);
		}
	}
	return result;
}

// Run if called directly
if (require.main === module) {
	generateTypes().catch((error) => {
		console.error('Type generation failed:', error);
		process.exit(1);
	});
}
