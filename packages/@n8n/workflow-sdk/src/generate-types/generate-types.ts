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
 *   src/types/generated/index.ts
 *   src/types/generated/nodes/n8n-nodes-base/*.ts
 *   src/types/generated/nodes/n8n-nodes-langchain/*.ts
 *
 * @generated - This file generates code, but is itself manually maintained.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// =============================================================================
// Configuration
// =============================================================================

const NODES_BASE_TYPES = path.resolve(__dirname, '../../../../nodes-base/dist/types/nodes.json');
const NODES_LANGCHAIN_TYPES = path.resolve(
	__dirname,
	'../../../nodes-langchain/dist/types/nodes.json',
);
const OUTPUT_PATH = path.join(os.homedir(), '.n8n', 'generated-types');

// Path to nodes-base dist for finding output schemas
const NODES_BASE_DIST = path.resolve(__dirname, '../../../../nodes-base/dist/nodes');

// Discriminator fields that create operation-specific parameter sets
// Only fields that truly benefit from splitting the type are included here
// Other fields like authentication, trigger, agent, promptType are treated as regular properties
const DISCRIMINATOR_FIELDS = ['resource', 'operation', 'mode'];

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

export interface NodeProperty {
	name: string;
	displayName: string;
	type: string;
	description?: string;
	hint?: string;
	builderHint?: string;
	default?: unknown;
	required?: boolean;
	options?: Array<{
		name: string;
		value?: string | number | boolean;
		description?: string;
		displayName?: string;
		builderHint?: string;
		values?: NodeProperty[];
	}>;
	displayOptions?: {
		show?: Record<string, unknown[]>;
		hide?: Record<string, unknown[]>;
	};
	typeOptions?: Record<string, unknown>;
	noDataExpression?: boolean;
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
 * Discover output schemas for a node from the __schema__ directory
 * Schema path pattern: dist/nodes/{NodeFolder}/__schema__/v{version}.0.0/{resource}/{operation}.json
 *
 * @param nodeName Full node name (e.g., 'n8n-nodes-base.freshservice')
 * @param version The node version number
 * @returns Array of discovered output schemas
 */
export function discoverSchemasForNode(nodeName: string, version: number): OutputSchema[] {
	const cacheKey = `${nodeName}:${version}`;
	if (schemaCache.has(cacheKey)) {
		return schemaCache.get(cacheKey)!;
	}

	const schemas: OutputSchema[] = [];

	// Extract node folder name from the node name
	// n8n-nodes-base.freshservice -> Freshservice (capitalized)
	const baseName = nodeName.split('.').pop() ?? '';
	// Try various capitalizations since folder names vary
	const possibleFolderNames = [
		baseName.charAt(0).toUpperCase() + baseName.slice(1), // Freshservice
		baseName, // freshservice
		baseName.toUpperCase(), // FRESHSERVICE
	];

	for (const folderName of possibleFolderNames) {
		const schemaDir = path.join(NODES_BASE_DIST, folderName, '__schema__');
		if (!fs.existsSync(schemaDir)) {
			continue;
		}

		// Try to find version directory - try exact match first, then closest lower version
		const versionDir = findVersionDirectory(schemaDir, version);
		if (!versionDir) {
			continue;
		}

		// Scan resource directories
		try {
			const resources = fs.readdirSync(versionDir, { withFileTypes: true });
			for (const resourceEntry of resources) {
				if (!resourceEntry.isDirectory()) continue;

				const resourceDir = path.join(versionDir, resourceEntry.name);
				const operations = fs.readdirSync(resourceDir, { withFileTypes: true });

				for (const opEntry of operations) {
					if (!opEntry.isFile() || !opEntry.name.endsWith('.json')) continue;

					const operationName = opEntry.name.replace('.json', '');
					const schemaPath = path.join(resourceDir, opEntry.name);

					try {
						const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
						const schema = JSON.parse(schemaContent) as JsonSchema;
						schemas.push({
							resource: resourceEntry.name,
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

		// Found schemas, no need to try other folder names
		if (schemas.length > 0) {
			break;
		}
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
	const indentStr = '\t'.repeat(indent);
	const nextIndent = '\t'.repeat(indent + 1);

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
				return String(v);
			})
			.join(' | ');
	}

	// Handle const
	if (schema.const !== undefined) {
		if (typeof schema.const === 'string') return `'${schema.const}'`;
		if (schema.const === null) return 'null';
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
 * Generate inline type for a nested property (used in fixedCollection)
 * This is a forward declaration - the actual function is defined below
 */
function mapNestedPropertyType(prop: NodeProperty): string {
	// Handle dynamic options (loadOptionsMethod)
	if (prop.typeOptions?.loadOptionsMethod || prop.typeOptions?.loadOptionsDependsOn) {
		switch (prop.type) {
			case 'options':
				return 'string | Expression<string>';
			case 'multiOptions':
				return 'string[]';
			default:
				return 'string | Expression<string>';
		}
	}

	switch (prop.type) {
		case 'string':
			return 'string | Expression<string>';
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
			return 'ResourceLocatorValue';
		case 'filter':
			return 'FilterValue';
		case 'assignmentCollection':
			return 'AssignmentCollectionValue';
		case 'fixedCollection':
			return generateFixedCollectionType(prop);
		case 'collection':
			return generateCollectionType(prop);
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
 * Generate a compact JSDoc comment for a nested property (used in fixedCollections)
 * Returns a multi-line JSDoc that can be placed before property definitions
 */
function generateNestedPropertyJSDoc(prop: NodeProperty, indent: string): string {
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
		const safeBuilderHint = prop.builderHint
			.replace(/\*\//g, '*\\/')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
		lines.push(`${indent} * @builderHint ${safeBuilderHint}`);
	}

	// Display options - filter out @version since version is implicit from the file
	if (prop.displayOptions) {
		if (prop.displayOptions.show && Object.keys(prop.displayOptions.show).length > 0) {
			const filteredShow = Object.entries(prop.displayOptions.show).filter(
				([key]) => key !== '@version',
			);
			if (filteredShow.length > 0) {
				const showConditions = filteredShow
					.map(
						([key, values]) =>
							`${key}: [${(values as unknown[]).map((v) => JSON.stringify(v)).join(', ')}]`,
					)
					.join(', ');
				lines.push(`${indent} * @displayOptions.show { ${showConditions} }`);
			}
		}
		if (prop.displayOptions.hide && Object.keys(prop.displayOptions.hide).length > 0) {
			const filteredHide = Object.entries(prop.displayOptions.hide).filter(
				([key]) => key !== '@version',
			);
			if (filteredHide.length > 0) {
				const hideConditions = filteredHide
					.map(
						([key, values]) =>
							`${key}: [${(values as unknown[]).map((v) => JSON.stringify(v)).join(', ')}]`,
					)
					.join(', ');
				lines.push(`${indent} * @displayOptions.hide { ${hideConditions} }`);
			}
		}
	}

	// Default value
	if (prop.default !== undefined && prop.default !== null && prop.default !== '') {
		const defaultStr =
			typeof prop.default === 'object' ? JSON.stringify(prop.default) : String(prop.default);
		lines.push(`${indent} * @default ${defaultStr}`);
	}

	lines.push(`${indent} */`);
	return lines.join('\n');
}

/**
 * Generate inline type for a fixedCollection property
 * This generates proper nested types instead of Record<string, unknown>
 */
function generateFixedCollectionType(prop: NodeProperty): string {
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

			const nestedType = mapNestedPropertyType(nestedProp);
			if (nestedType) {
				const quotedName = quotePropertyName(nestedProp.name);
				// Generate JSDoc for the nested property
				const jsDoc = generateNestedPropertyJSDoc(nestedProp, '\t\t\t');
				nestedProps.push(`${jsDoc}\n\t\t\t${quotedName}?: ${nestedType}`);
			}
		}

		if (nestedProps.length > 0) {
			const innerType = `{\n${nestedProps.join(';\n')};\n\t\t}`;
			const groupType = isMultipleValues ? `Array<${innerType}>` : innerType;

			// Generate JSDoc for the group if it has builderHint or description
			const groupJsDocLines: string[] = [];
			if (group.displayName || group.description) {
				const desc = (group.description ?? group.displayName ?? '')
					.replace(/\*\//g, '*\\/')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;');
				groupJsDocLines.push(`\t\t/** ${desc}`);
			}
			if (group.builderHint) {
				const safeBuilderHint = group.builderHint
					.replace(/\*\//g, '*\\/')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;');
				if (groupJsDocLines.length === 0) {
					groupJsDocLines.push(`\t\t/**`);
				}
				groupJsDocLines.push(`\t\t * @builderHint ${safeBuilderHint}`);
			}

			if (groupJsDocLines.length > 0) {
				groupJsDocLines.push(`\t\t */`);
				groups.push(`${groupJsDocLines.join('\n')}\n\t\t${groupName}?: ${groupType}`);
			} else {
				groups.push(`${groupName}?: ${groupType}`);
			}
		}
	}

	if (groups.length === 0) {
		return 'Record<string, unknown>';
	}

	return `{\n\t\t${groups.join(';\n\t\t')};\n\t}`;
}

/**
 * Generate inline type for a collection property
 * Collections have a flat structure with optional nested properties
 */
function generateCollectionType(prop: NodeProperty): string {
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

		const propType = mapNestedPropertyType(nestedProp as NodeProperty);
		if (propType) {
			const quotedName = quotePropertyName(nestedProp.name);
			// Generate JSDoc for the nested property
			const jsDoc = generateNestedPropertyJSDoc(nestedProp as NodeProperty, '\t\t');
			nestedProps.push(`${jsDoc}\n\t\t${quotedName}?: ${propType}`);
		}
	}

	if (nestedProps.length === 0) {
		return 'Record<string, unknown>';
	}

	return `{\n${nestedProps.join(';\n')};\n\t}`;
}

/**
 * Map n8n property types to TypeScript types with Expression wrappers
 */
export function mapPropertyType(prop: NodeProperty): string {
	// Special handling for known credentialsSelect fields with fixed values
	if (prop.type === 'credentialsSelect' && prop.name === 'genericAuthType') {
		const values = GENERIC_AUTH_TYPE_VALUES.map((v) => `'${v}'`).join(' | ');
		return `${values} | Expression<string>`;
	}

	// Handle dynamic options (loadOptionsMethod)
	if (prop.typeOptions?.loadOptionsMethod || prop.typeOptions?.loadOptionsDependsOn) {
		// Dynamic options fallback to string
		switch (prop.type) {
			case 'options':
				return 'string | Expression<string>';
			case 'multiOptions':
				return 'string[]';
			default:
				return 'string | Expression<string>';
		}
	}

	switch (prop.type) {
		case 'string':
			return 'string | Expression<string>';

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
			return 'ResourceLocatorValue';

		case 'filter':
			return 'FilterValue';

		case 'assignmentCollection':
			return 'AssignmentCollectionValue';

		case 'fixedCollection':
			return generateFixedCollectionType(prop);

		case 'collection':
			return generateCollectionType(prop);

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
				return showResource && showResource.includes(resource);
			});

			if (opProp && opProp.options) {
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

		if (discProp && discProp.options) {
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
 * Get properties applicable to a specific discriminator combination
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
			for (const [key, values] of Object.entries(prop.displayOptions.show)) {
				if (combination[key] !== undefined) {
					// This property has a condition on this discriminator
					if (!values.includes(combination[key])) {
						matches = false;
						break;
					}
				}
			}

			if (matches) {
				result.push(prop);
			}
		} else if (!prop.displayOptions?.hide) {
			// Property has no conditions - include it (global property)
			// But only if it doesn't have hide conditions that exclude this combination
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
		const configName = `${nodeName}${versionSuffix}Config`;
		lines.push(`export interface ${configName} {`);

		// Track seen property names to avoid duplicates
		const seenNames = new Set<string>();
		for (const prop of node.properties) {
			if (['notice', 'curlImport', 'credentials'].includes(prop.type)) {
				continue;
			}
			if (seenNames.has(prop.name)) {
				continue; // Skip duplicate property names
			}
			seenNames.add(prop.name);
			const propLine = generatePropertyLine(prop, !prop.required);
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
		const configName = `${nodeName}${comboValues.join('')}Config`;
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
				lines.push(`\t${key}: '${value}';`);
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
			const propLine = generatePropertyLine(prop, !prop.required, combo);
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
		const safeBuilderHint = prop.builderHint
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
				if (discriminatorContext && discriminatorContext[key] !== undefined) {
					const showValues = values as unknown[];
					// If the discriminator value is in the show list, this is redundant
					if (showValues.includes(discriminatorContext[key])) return false;
				}
				return true;
			});
			if (filteredShow.length > 0) {
				const showConditions = filteredShow
					.map(
						([key, values]) =>
							`${key}: [${(values as unknown[]).map((v) => JSON.stringify(v)).join(', ')}]`,
					)
					.join(', ');
				lines.push(` * @displayOptions.show { ${showConditions} }`);
			}
		}
		if (prop.displayOptions.hide && Object.keys(prop.displayOptions.hide).length > 0) {
			const filteredHide = Object.entries(prop.displayOptions.hide).filter(([key, values]) => {
				// Filter out @version (existing behavior)
				if (key === '@version') return false;
				// Filter out conditions that match current discriminator context
				if (discriminatorContext && discriminatorContext[key] !== undefined) {
					const hideValues = values as unknown[];
					// If the discriminator value is in the hide list, this is redundant
					if (hideValues.includes(discriminatorContext[key])) return false;
				}
				return true;
			});
			if (filteredHide.length > 0) {
				const hideConditions = filteredHide
					.map(
						([key, values]) =>
							`${key}: [${(values as unknown[]).map((v) => JSON.stringify(v)).join(', ')}]`,
					)
					.join(', ');
				lines.push(` * @displayOptions.hide { ${hideConditions} }`);
			}
		}
	}

	// Default value
	if (prop.default !== undefined && prop.default !== null && prop.default !== '') {
		const defaultStr =
			typeof prop.default === 'object' ? JSON.stringify(prop.default) : String(prop.default);
		lines.push(` * @default ${defaultStr}`);
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
	const tsType = mapPropertyType(prop);
	if (!tsType) {
		return ''; // Skip this property
	}

	const lines: string[] = [];

	// JSDoc - generate if description, displayOptions, hint, builderHint, or non-trivial default exists
	// This ensures LLMs can see dependency information even for properties without descriptions
	const hasDisplayOptions =
		prop.displayOptions &&
		((prop.displayOptions.show && Object.keys(prop.displayOptions.show).length > 0) ||
			(prop.displayOptions.hide && Object.keys(prop.displayOptions.hide).length > 0));
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
	lines.push(`\t${propName}${optionalMarker}: ${tsType};`);

	return lines.join('\n\t');
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
	importDepth: number = 5,
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

	// Helper function to check if property needs Expression import
	const propNeedsExpression = (p: NodeProperty): boolean => {
		if (p.type === 'fixedCollection' || p.type === 'collection') {
			return false;
		}
		return ['string', 'number', 'boolean', 'options', 'json', 'dateTime', 'color'].includes(p.type);
	};

	// Check properties
	const outputProps = filteredProperties.filter(
		(p) => !['notice', 'curlImport', 'credentials'].includes(p.type),
	);

	// Determine imports needed
	const needsExpression = outputProps.some(propNeedsExpression);
	const needsCredentialReference = node.credentials && node.credentials.length > 0;
	const needsIDataObject = outputProps.some((p) => p.type === 'json');

	// Build imports (relative path based on depth)
	const basePath = '../'.repeat(importDepth) + 'base';
	const baseImports: string[] = ['NodeConfig'];
	if (needsExpression) baseImports.unshift('Expression');
	if (needsCredentialReference)
		baseImports.splice(baseImports.length - 1, 0, 'CredentialReference');

	lines.push(`import type { ${baseImports.join(', ')} } from '${basePath}';`);
	if (needsIDataObject) {
		lines.push(`import type { IDataObject } from '${basePath}';`);
	}
	lines.push('');

	// Re-export imports that discriminator files will need
	lines.push('// Re-export types for discriminator files');
	lines.push(`export type { ${baseImports.join(', ')} } from '${basePath}';`);
	if (needsIDataObject) {
		lines.push(`export type { IDataObject } from '${basePath}';`);
	}
	lines.push('');

	// Helper types
	const needsResourceLocator = outputProps.some((p) => p.type === 'resourceLocator');
	const needsFilter = outputProps.some((p) => p.type === 'filter');
	const needsAssignment = outputProps.some((p) => p.type === 'assignmentCollection');

	if (needsResourceLocator || needsFilter || needsAssignment) {
		lines.push('// Helper types for special n8n fields');
		if (needsResourceLocator) {
			lines.push(
				'export type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };',
			);
		}
		if (needsFilter) {
			lines.push(
				'export type FilterValue = { conditions: Array<{ leftValue: unknown; operator: { type: string; operation: string }; rightValue: unknown }> };',
			);
		}
		if (needsAssignment) {
			lines.push(
				'export type AssignmentCollectionValue = { assignments: Array<{ id: string; name: string; value: unknown; type: string }> };',
			);
		}
		lines.push('');
	}

	// Credentials
	lines.push('// ' + '='.repeat(75));
	lines.push('// Credentials');
	lines.push('// ' + '='.repeat(75));
	lines.push('');

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
			lines.push(`\t${cred.name}${optional}: CredentialReference;`);
		}

		// Add generic auth credentials if node supports genericAuthType
		const hasGenericAuthType = node.properties.some(
			(p) => p.name === 'genericAuthType' && p.type === 'credentialsSelect',
		);
		if (hasGenericAuthType) {
			lines.push(
				`\t/** Generic auth credentials - set the 'genericAuthType' config parameter to select which one to use */`,
			);
			for (const credName of GENERIC_AUTH_TYPE_VALUES) {
				if (!seenCreds.has(credName)) {
					seenCreds.add(credName);
					lines.push(`\t${credName}?: CredentialReference;`);
				}
			}
		}

		lines.push('}');
		lines.push('');
	}

	// Base type
	lines.push('// ' + '='.repeat(75));
	lines.push('// Base Node Type');
	lines.push('// ' + '='.repeat(75));
	lines.push('');

	const baseTypeName = `${nodeName}${versionSuffix}NodeBase`;
	lines.push(`export interface ${baseTypeName} {`);
	lines.push(`\ttype: '${node.name}';`);
	lines.push(`\tversion: ${version};`);
	if (credTypeName) {
		lines.push(`\tcredentials?: ${credTypeName};`);
	}
	if (isTrigger) {
		lines.push('\tisTrigger: true;');
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
	importDepth: number = 5,
): string {
	const prefix = getPackagePrefix(node.name);
	const nodeName = prefix + toPascalCase(getNodeBaseName(node.name));
	const versionSuffix = versionToTypeName(version);
	const isTrigger = isTriggerNode(node);

	// Build type name from discriminator values
	const comboValues = Object.entries(combo)
		.filter(([_, v]) => v !== undefined)
		.map(([_, v]) => toPascalCase(v!));
	const configName = `${nodeName}${versionSuffix}${comboValues.join('')}Config`;
	const outputTypeName = `${nodeName}${versionSuffix}${comboValues.join('')}Output`;
	const nodeTypeName = `${nodeName}${versionSuffix}${comboValues.join('')}Node`;

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
	const needsResourceLocator = props.some((p) => p.type === 'resourceLocator');
	const needsFilter = props.some((p) => p.type === 'filter');
	const needsAssignment = props.some((p) => p.type === 'assignmentCollection');
	const needsIDataObject = props.some((p) => p.type === 'json');
	const needsCredentialReference = node.credentials && node.credentials.length > 0;

	// Build imports directly from base (self-contained, no _shared.ts)
	const basePath = '../'.repeat(importDepth) + 'base';
	const baseImports: string[] = ['Expression', 'NodeConfig'];
	if (needsCredentialReference) baseImports.push('CredentialReference');
	if (needsIDataObject) baseImports.push('IDataObject');

	lines.push(`import type { ${baseImports.join(', ')} } from '${basePath}';`);
	lines.push('');

	// Inline helper types (only the ones needed)
	if (needsResourceLocator || needsFilter || needsAssignment) {
		lines.push('// Helper types for special n8n fields');
		if (needsResourceLocator) {
			lines.push(
				'type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };',
			);
		}
		if (needsFilter) {
			lines.push(
				'type FilterValue = { conditions: Array<{ leftValue: unknown; operator: { type: string; operation: string }; rightValue: unknown }> };',
			);
		}
		if (needsAssignment) {
			lines.push(
				'type AssignmentCollectionValue = { assignments: Array<{ id: string; name: string; value: unknown; type: string }> };',
			);
		}
		lines.push('');
	}

	// Inline credentials interface (if node has credentials)
	if (node.credentials && node.credentials.length > 0) {
		lines.push('// ' + '='.repeat(75));
		lines.push('// Credentials');
		lines.push('// ' + '='.repeat(75));
		lines.push('');
		lines.push('interface Credentials {');
		const seenCreds = new Set<string>();
		for (const cred of node.credentials) {
			if (seenCreds.has(cred.name)) continue;
			seenCreds.add(cred.name);
			const optional = !cred.required ? '?' : '';
			lines.push(`\t${cred.name}${optional}: CredentialReference;`);
		}

		// Add generic auth credentials if node supports genericAuthType
		const hasGenericAuthType = node.properties.some(
			(p) => p.name === 'genericAuthType' && p.type === 'credentialsSelect',
		);
		if (hasGenericAuthType) {
			lines.push(
				`\t/** Generic auth credentials - set the 'genericAuthType' config parameter to select which one to use */`,
			);
			for (const credName of GENERIC_AUTH_TYPE_VALUES) {
				if (!seenCreds.has(credName)) {
					seenCreds.add(credName);
					lines.push(`\t${credName}?: CredentialReference;`);
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

	// Config type
	lines.push('// ' + '='.repeat(75));
	lines.push('// Config');
	lines.push('// ' + '='.repeat(75));
	lines.push('');

	if (description) {
		lines.push(`/** ${description} */`);
	}
	lines.push(`export type ${configName} = {`);

	// Add discriminator fields
	for (const [key, value] of Object.entries(combo)) {
		if (value !== undefined) {
			lines.push(`\t${key}: '${value}';`);
		}
	}

	// Add properties
	const seenNames = new Set<string>();
	for (const prop of props) {
		if (seenNames.has(prop.name)) continue;
		seenNames.add(prop.name);
		// Pass combo as discriminator context to filter redundant displayOptions
		const propLine = generatePropertyLine(prop, !prop.required, combo);
		if (propLine) {
			lines.push(propLine);
		}
	}

	lines.push('};');
	lines.push('');

	// Output type (if schema provided)
	if (schema) {
		lines.push('// ' + '='.repeat(75));
		lines.push('// Output');
		lines.push('// ' + '='.repeat(75));
		lines.push('');
		lines.push(`export type ${outputTypeName} = ${jsonSchemaToTypeScript(schema)};`);
		lines.push('');
	}

	// Node type (inline, not extending NodeBase)
	lines.push('// ' + '='.repeat(75));
	lines.push('// Node Type');
	lines.push('// ' + '='.repeat(75));
	lines.push('');

	lines.push(`export type ${nodeTypeName} = {`);
	lines.push(`\ttype: '${node.name}';`);
	lines.push(`\tversion: ${version};`);
	if (node.credentials && node.credentials.length > 0) {
		lines.push('\tcredentials?: Credentials;');
	}
	if (isTrigger) {
		lines.push('\tisTrigger: true;');
	}
	lines.push(`\tconfig: NodeConfig<${configName}>;`);
	if (schema) {
		lines.push(`\toutput?: ${outputTypeName};`);
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
			lines.push(`\t| ${typeName}`);
		}
		lines.push('\t;');
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
			lines.push(`\t| ${typeName}`);
		}
		lines.push('\t;');
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

	// No _shared.ts - each discriminator file is self-contained

	if (tree.type === 'resource_operation' && tree.resources) {
		// Resource/operation pattern: nested directories
		for (const [resource, operations] of tree.resources) {
			const resourceDir = `resource_${toSnakeCase(resource)}`;

			// Generate operation files within resource directory
			for (const operation of operations) {
				const combo = { resource, operation };
				// Filter properties by version before getting combination-specific props
				const versionFilteredProps = filterPropertiesForVersion(node.properties, version);
				const nodeForCombination = { ...node, properties: versionFilteredProps };
				const props = getPropertiesForCombination(nodeForCombination, combo);
				const fileName = `operation_${toSnakeCase(operation)}.ts`;
				const filePath = `${resourceDir}/${fileName}`;

				// Import depth: 6 levels deep (node/version/resource_x/operation.ts -> base)
				const content = generateDiscriminatorFile(node, version, combo, props, undefined, 6);
				files.set(filePath, content);
			}

			// Generate resource index file
			const resourceIndexContent = generateResourceIndexFile(node, version, resource, operations);
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
	const outputSchemas = discoverSchemasForNode(node.name, specificVersion);

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

	// Extract AI input types for narrowed subnode config
	const aiInputTypes = extractAIInputTypes(node);
	const subnodeInstanceImports = getSubnodeInstanceTypeImports(aiInputTypes);
	const subnodeConfigTypeName =
		aiInputTypes.length > 0 ? `${nodeName}${versionSuffix}SubnodeConfig` : undefined;

	// Helper function to check if a property type needs Expression import
	const propNeedsExpression = (p: NodeProperty): boolean => {
		if (p.type === 'fixedCollection' || p.type === 'collection') {
			return false;
		}
		return ['string', 'number', 'boolean', 'options', 'json', 'dateTime', 'color'].includes(p.type);
	};

	// Check filtered properties that will actually be output
	const outputProps = filteredProperties.filter(
		(p) => !['notice', 'curlImport', 'credentials'].includes(p.type),
	);

	// Determine which imports are needed based on filtered properties
	const needsExpression = outputProps.some(propNeedsExpression);
	const needsCredentialReference = node.credentials && node.credentials.length > 0;
	const needsIDataObject = outputProps.some((p) => p.type === 'json');

	// Build imports
	const baseImports: string[] = ['NodeConfig'];
	if (needsExpression) baseImports.unshift('Expression');
	if (needsCredentialReference)
		baseImports.splice(baseImports.length - 1, 0, 'CredentialReference');

	// Add subnode instance type imports if needed
	if (subnodeInstanceImports.length > 0) {
		baseImports.push(...subnodeInstanceImports);
	}

	lines.push(`import type { ${baseImports.join(', ')} } from '../../../../base';`);
	if (needsIDataObject) {
		lines.push("import type { IDataObject } from '../../../../base';");
	}
	lines.push('');

	// Helper types (if needed) based on filtered properties
	const needsResourceLocator = outputProps.some((p) => p.type === 'resourceLocator');
	const needsFilter = outputProps.some((p) => p.type === 'filter');
	const needsAssignment = outputProps.some((p) => p.type === 'assignmentCollection');

	if (needsResourceLocator || needsFilter || needsAssignment) {
		lines.push('// Helper types for special n8n fields');
		if (needsResourceLocator) {
			lines.push(
				'type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };',
			);
		}
		if (needsFilter) {
			lines.push(
				'type FilterValue = { conditions: Array<{ leftValue: unknown; operator: { type: string; operation: string }; rightValue: unknown }> };',
			);
		}
		if (needsAssignment) {
			lines.push(
				'type AssignmentCollectionValue = { assignments: Array<{ id: string; name: string; value: unknown; type: string }> };',
			);
		}
		lines.push('');
	}

	// Parameters section
	lines.push('// ' + '='.repeat(75));
	lines.push('// Parameters');
	lines.push('// ' + '='.repeat(75));
	lines.push('');

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
		const matchingSchema =
			configInfo.resource && configInfo.operation
				? findSchemaForOperation(outputSchemas, configInfo.resource, configInfo.operation)
				: undefined;

		if (matchingSchema) {
			// Generate output type name by replacing 'Config' with 'Output'
			let outputTypeName = configInfo.typeName.replace(/Config$/, 'Output');
			// Handle case where type name doesn't end with Config (simple interface)
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
		lines.push('// ' + '='.repeat(75));
		lines.push('// Output Types');
		lines.push('// ' + '='.repeat(75));
		lines.push('');

		for (const { typeName, schema } of outputTypesToGenerate) {
			lines.push(`export type ${typeName} = ${jsonSchemaToTypeScript(schema)};`);
			lines.push('');
		}
	}

	// Subnode Config section (for AI nodes)
	if (subnodeConfigTypeName) {
		lines.push('// ' + '='.repeat(75));
		lines.push('// Subnode Configuration');
		lines.push('// ' + '='.repeat(75));
		lines.push('');

		const subnodeConfigCode = generateNarrowedSubnodeConfig(aiInputTypes, nodeName, versionSuffix);
		if (subnodeConfigCode) {
			lines.push(subnodeConfigCode);
			lines.push('');
		}
	}

	// Credentials section
	lines.push('// ' + '='.repeat(75));
	lines.push('// Credentials');
	lines.push('// ' + '='.repeat(75));
	lines.push('');

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
			lines.push(`\t${cred.name}${optional}: CredentialReference;`);
		}

		// Add generic auth credentials if node supports genericAuthType
		const hasGenericAuthType = node.properties.some(
			(p) => p.name === 'genericAuthType' && p.type === 'credentialsSelect',
		);
		if (hasGenericAuthType) {
			lines.push(
				`\t/** Generic auth credentials - set the 'genericAuthType' config parameter to select which one to use */`,
			);
			for (const credName of GENERIC_AUTH_TYPE_VALUES) {
				if (!seenCreds.has(credName)) {
					seenCreds.add(credName);
					lines.push(`\t${credName}?: CredentialReference;`);
				}
			}
		}

		lines.push('}');
		lines.push('');
	}

	// Node type section
	lines.push('// ' + '='.repeat(75));
	lines.push('// Node Types');
	lines.push('// ' + '='.repeat(75));
	lines.push('');

	// Generate base type with common fields to avoid repetition
	const baseTypeName = `${nodeName}${versionSuffix}NodeBase`;
	lines.push(`interface ${baseTypeName} {`);
	lines.push(`\ttype: '${node.name}';`);
	lines.push(`\tversion: ${specificVersion};`);
	if (credTypeName) {
		lines.push(`\tcredentials?: ${credTypeName};`);
	}
	if (isTrigger) {
		lines.push('\tisTrigger: true;');
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
		if (subnodeConfigTypeName) {
			lines.push(
				`\tconfig: NodeConfig<${configInfo.typeName}> & { subnodes?: ${subnodeConfigTypeName} };`,
			);
		} else {
			lines.push(`\tconfig: NodeConfig<${configInfo.typeName}>;`);
		}
		if (outputTypeName) {
			lines.push(`\toutput?: ${outputTypeName};`);
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
			lines.push(`\t| ${individualNodeTypes[i]}`);
		}
		lines.push('\t;');
	} else {
		// No config types - shouldn't happen, but handle gracefully
		lines.push(`export type ${nodeTypeName} = ${baseTypeName} & {`);
		lines.push(`\tconfig: NodeConfig<Record<string, unknown>>;`);
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
	// Suppress unused variable warnings - some imports may be conditional
	lines.push('');

	// Helper function to check if a property type needs Expression import
	// Only types that produce "| Expression<T>" in output need the import
	const propNeedsExpression = (p: NodeProperty): boolean => {
		// fixedCollection and collection map to Record<string, unknown> - no Expression needed
		if (p.type === 'fixedCollection' || p.type === 'collection') {
			return false;
		}
		// These types include Expression wrapper in their output
		return ['string', 'number', 'boolean', 'options', 'json', 'dateTime', 'color'].includes(p.type);
	};

	// Check properties that will actually be output (skip notice, curlImport, etc.) across all node entries
	const outputProps = nodeArray.flatMap((n) =>
		n.properties.filter((p) => !['notice', 'curlImport', 'credentials'].includes(p.type)),
	);

	// Determine which imports are needed based on actual output
	const needsExpression = outputProps.some(propNeedsExpression);
	const needsCredentialReference = nodeArray.some((n) => n.credentials && n.credentials.length > 0);
	const needsIDataObject = outputProps.some((p) => p.type === 'json');

	// Build imports - only include what's actually used
	const baseImports: string[] = ['NodeConfig'];
	if (needsExpression) baseImports.unshift('Expression');
	if (needsCredentialReference)
		baseImports.splice(baseImports.length - 1, 0, 'CredentialReference');

	lines.push(`import type { ${baseImports.join(', ')} } from '../../../base';`);
	if (needsIDataObject) {
		lines.push("import type { IDataObject } from '../../../base';");
	}
	lines.push('');

	// Helper types (if needed) - only add if they'll actually be used in output
	const needsResourceLocator = outputProps.some((p) => p.type === 'resourceLocator');
	const needsFilter = outputProps.some((p) => p.type === 'filter');
	const needsAssignment = outputProps.some((p) => p.type === 'assignmentCollection');

	if (needsResourceLocator || needsFilter || needsAssignment) {
		lines.push('// Helper types for special n8n fields');
		if (needsResourceLocator) {
			lines.push(
				'type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };',
			);
		}
		if (needsFilter) {
			lines.push(
				'type FilterValue = { conditions: Array<{ leftValue: unknown; operator: { type: string; operation: string }; rightValue: unknown }> };',
			);
		}
		if (needsAssignment) {
			lines.push(
				'type AssignmentCollectionValue = { assignments: Array<{ id: string; name: string; value: unknown; type: string }> };',
			);
		}
		lines.push('');
	}

	// Note: fixedCollection types are represented as Record<string, unknown>
	// to avoid naming conflicts across nodes with different structures

	// Separator
	lines.push('// ' + '='.repeat(75));
	lines.push('// Parameters');
	lines.push('// ' + '='.repeat(75));
	lines.push('');

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

	// Generate credentials type for each version entry
	lines.push('// ' + '='.repeat(75));
	lines.push('// Credentials');
	lines.push('// ' + '='.repeat(75));
	lines.push('');

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
				lines.push(`\t${cred.name}${optional}: CredentialReference;`);
			}

			// Add generic auth credentials if node supports genericAuthType
			const hasGenericAuthType = n.properties.some(
				(p) => p.name === 'genericAuthType' && p.type === 'credentialsSelect',
			);
			if (hasGenericAuthType) {
				lines.push(
					`\t/** Generic auth credentials - set the 'genericAuthType' config parameter to select which one to use */`,
				);
				for (const credName of GENERIC_AUTH_TYPE_VALUES) {
					if (!seenCreds.has(credName)) {
						seenCreds.add(credName);
						lines.push(`\t${credName}?: CredentialReference;`);
					}
				}
			}

			lines.push('}');
			lines.push('');
		}
	}

	// Generate node type for each version entry
	lines.push('// ' + '='.repeat(75));
	lines.push('// Node Types');
	lines.push('// ' + '='.repeat(75));
	lines.push('');

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
		lines.push(`\ttype: '${n.name}';`);
		lines.push(`\tversion: ${versionUnion};`);
		lines.push(`\tconfig: NodeConfig<${nodeName}${entryVersionSuffix}Params>;`);
		lines.push(`\tcredentials?: ${credType};`);

		if (isTrigger) {
			lines.push('\tisTrigger: true;');
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
		const configName = `${nodeName}${versionSuffix}Config`;
		lines.push(`export interface ${configName} {`);

		// Track seen property names to avoid duplicates
		const seenNames = new Set<string>();
		for (const prop of node.properties) {
			if (['notice', 'curlImport', 'credentials'].includes(prop.type)) {
				continue;
			}
			if (seenNames.has(prop.name)) {
				continue; // Skip duplicate property names
			}
			seenNames.add(prop.name);
			const propLine = generatePropertyLine(prop, !prop.required);
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
		const configName = `${nodeName}${versionSuffix}${comboValues.join('')}Config`;
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
				lines.push(`\t${key}: '${value}';`);
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
			const propLine = generatePropertyLine(prop, !prop.required, combo);
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
		const prefix = i === 0 ? '\t| ' : '\t| ';
		lines.push(`${prefix}'${nodes[i].name}'`);
	}
	lines.push('\t;');
	lines.push('');

	// Generate AllNodeTypes union (union of all *Node types for use with NodeFn)
	lines.push('// Union of all node input types for type-safe node() function');
	lines.push('export type AllNodeTypes =');
	for (let i = 0; i < sortedNodes.length; i++) {
		const node = sortedNodes[i];
		const prefix = getPackagePrefix(node.name);
		const nodeName = prefix + toPascalCase(getNodeBaseName(node.name));
		const unionPrefix = i === 0 ? '\t| ' : '\t| ';
		lines.push(`${unionPrefix}${nodeName}Node`);
	}
	lines.push('\t;');

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
		if (inputType && inputType.startsWith('ai_')) {
			// If any input of this type is required, mark it as required
			const existingRequired = aiTypes.get(inputType) ?? false;
			aiTypes.set(inputType, existingRequired || isRequired);
		}
	}

	return [...aiTypes.entries()].map(([type, required]) => ({ type, required }));
}

/**
 * Generate a narrowed SubnodeConfig interface for a node based on its accepted AI input types.
 *
 * @param aiInputTypes Array of AI input types with required status
 * @param nodeName The node name (PascalCase, e.g., 'LcAgent')
 * @param versionSuffix The version suffix (e.g., 'V31')
 * @returns TypeScript interface code, or null if no AI inputs
 */
export function generateNarrowedSubnodeConfig(
	aiInputTypes: AIInputTypeInfo[],
	nodeName: string,
	versionSuffix: string,
): string | null {
	if (aiInputTypes.length === 0) {
		return null;
	}

	const lines: string[] = [];
	const interfaceName = `${nodeName}${versionSuffix}SubnodeConfig`;

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

		// Mark field as optional only if not required
		const optional = aiInput.required ? '' : '?';
		lines.push(`\t${fieldInfo.fieldName}${optional}: ${typeStr};`);
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
				const prefix = i === 0 ? '\t| ' : '\t| ';
				lines.push(`${prefix}'${nodeNames[i]}'`);
			}
			lines.push('\t;');
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
	const nodes = JSON.parse(content) as NodeTypeDescription[];

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

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Write files from a plan map to disk
 * Creates directories as needed
 */
async function writePlanToDisk(baseDir: string, plan: Map<string, string>): Promise<number> {
	let fileCount = 0;
	for (const [relativePath, content] of plan) {
		const fullPath = path.join(baseDir, relativePath);
		const dir = path.dirname(fullPath);
		await fs.promises.mkdir(dir, { recursive: true });
		await fs.promises.writeFile(fullPath, content);
		fileCount++;
	}
	return fileCount;
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
	let generatedFiles = 0;
	let generatedDirs = 0;
	let splitVersions = 0;
	let flatVersions = 0;

	for (const [nodeName, nodes] of nodesByName) {
		try {
			// Debug: log set node processing
			if (nodeName === 'set') {
				console.log(`  DEBUG: Processing set node with ${nodes.length} entries`);
			}
			// Create directory for this node
			const nodeDir = path.join(packageDir, nodeName);
			await fs.promises.mkdir(nodeDir, { recursive: true });
			generatedDirs++;
			if (nodeName === 'set') {
				console.log(`  DEBUG: Created directory at ${nodeDir}`);
			}

			// Collect all individual versions from all node entries and map them to their source node
			// This allows us to generate a file per individual version (e.g., v3, v31, v32, v33, v34)
			const versionToNode = new Map<number, NodeTypeDescription>();
			const allVersions: number[] = [];
			// Track which versions use split structure
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

			// Generate files for each individual version
			for (const version of allVersions) {
				const sourceNode = versionToNode.get(version)!;
				const fileName = versionToFileName(version);

				// Check if this node uses a discriminator pattern that benefits from splitting
				if (hasDiscriminatorPattern(sourceNode)) {
					// Generate split structure in a version directory
					const versionDir = path.join(nodeDir, fileName);
					const plan = planSplitVersionFiles(sourceNode, version);
					const count = await writePlanToDisk(versionDir, plan);
					generatedFiles += count;
					splitVersionsSet.add(version);
					splitVersions++;
				} else {
					// Generate flat file
					const content = generateSingleVersionTypeFile(sourceNode, version);
					const filePath = path.join(nodeDir, `${fileName}.ts`);
					await fs.promises.writeFile(filePath, content);
					generatedFiles++;
					flatVersions++;
				}
			}

			// Generate index.ts that re-exports all individual versions
			// Pass splitVersionsSet so it knows which versions are directories vs files
			const indexContent = generateVersionIndexFile(nodes[0], allVersions, splitVersionsSet);
			await fs.promises.writeFile(path.join(nodeDir, 'index.ts'), indexContent);

			// Add first node to allNodes for main index generation
			allNodes.push(nodes[0]);
		} catch (error) {
			console.error(`  Error generating ${nodeName}:`, error);
		}
	}

	console.log(
		`  Generated ${generatedDirs} node directories with ${generatedFiles} files (${splitVersions} split, ${flatVersions} flat)`,
	);
	return allNodes;
}

/**
 * Generate all types
 */
export async function generateTypes(): Promise<void> {
	console.log('Starting type generation...');

	// Ensure output directories exist
	const nodesBaseDir = path.join(OUTPUT_PATH, 'nodes/n8n-nodes-base');
	const nodesLangchainDir = path.join(OUTPUT_PATH, 'nodes/n8n-nodes-langchain');

	await fs.promises.mkdir(nodesBaseDir, { recursive: true });
	await fs.promises.mkdir(nodesLangchainDir, { recursive: true });

	const allNodes: NodeTypeDescription[] = [];

	// Load nodes-base
	if (fs.existsSync(NODES_BASE_TYPES)) {
		console.log(`Loading nodes from ${NODES_BASE_TYPES}...`);
		const nodesBase = await loadNodeTypes(NODES_BASE_TYPES, 'n8n-nodes-base');
		console.log(`  Found ${nodesBase.length} node entries in nodes-base`);

		// Group nodes by their base name (for nodes with multiple version entries)
		const nodesByName = new Map<string, NodeTypeDescription[]>();
		for (const node of nodesBase) {
			if (node.hidden) continue;
			const fileName = nodeNameToFileName(node.name);
			if (!nodesByName.has(fileName)) {
				nodesByName.set(fileName, []);
			}
			nodesByName.get(fileName)!.push(node);
		}
		console.log(`  Grouped into ${nodesByName.size} unique nodes`);

		// Generate version-specific files
		const baseNodes = await generateVersionSpecificFiles(
			nodesBaseDir,
			'n8n-nodes-base',
			nodesByName,
		);
		allNodes.push(...baseNodes);
	} else {
		console.log(`Warning: ${NODES_BASE_TYPES} not found. Run 'pnpm build' in nodes-base first.`);
	}

	// Load nodes-langchain
	if (fs.existsSync(NODES_LANGCHAIN_TYPES)) {
		console.log(`Loading nodes from ${NODES_LANGCHAIN_TYPES}...`);
		const nodesLangchain = await loadNodeTypes(NODES_LANGCHAIN_TYPES, '@n8n/n8n-nodes-langchain');
		console.log(`  Found ${nodesLangchain.length} node entries in nodes-langchain`);

		// Group nodes by their base name (for nodes with multiple version entries)
		const nodesByName = new Map<string, NodeTypeDescription[]>();
		for (const node of nodesLangchain) {
			if (node.hidden) continue;
			const fileName = nodeNameToFileName(node.name);
			if (!nodesByName.has(fileName)) {
				nodesByName.set(fileName, []);
			}
			nodesByName.get(fileName)!.push(node);
		}
		console.log(`  Grouped into ${nodesByName.size} unique nodes`);

		// Generate version-specific files
		const langchainNodes = await generateVersionSpecificFiles(
			nodesLangchainDir,
			'n8n-nodes-langchain',
			nodesByName,
		);
		allNodes.push(...langchainNodes);
	} else {
		console.log(
			`Warning: ${NODES_LANGCHAIN_TYPES} not found. Run 'pnpm build' in nodes-langchain first.`,
		);
	}

	// Generate index file
	if (allNodes.length > 0) {
		const indexContent = generateIndexFile(allNodes);
		await fs.promises.writeFile(path.join(OUTPUT_PATH, 'index.ts'), indexContent);
		console.log(`Generated index.ts with ${allNodes.length} node exports`);
	} else {
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
		await fs.promises.writeFile(path.join(OUTPUT_PATH, 'index.ts'), placeholderContent);
		console.log('Generated placeholder index.ts (no nodes found)');
	}

	console.log('Type generation complete!');
}

// Run if called directly
if (require.main === module) {
	generateTypes().catch((error) => {
		console.error('Type generation failed:', error);
		process.exit(1);
	});
}
