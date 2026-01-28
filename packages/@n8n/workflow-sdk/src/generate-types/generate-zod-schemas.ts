/**
 * Zod Schema Generation
 *
 * Generates Zod validation schemas alongside TypeScript types for node configurations.
 * These schemas enable runtime validation of node configs via .parse() or .safeParse().
 *
 * This module parallels generate-types.ts but outputs Zod schemas instead of TypeScript types.
 */

import type {
	NodeProperty,
	NodeTypeDescription,
	DiscriminatorCombination,
	DiscriminatorTree,
	AIInputTypeInfo,
} from './generate-types';

import {
	extractDiscriminatorCombinations,
	getPropertiesForCombination,
	filterPropertiesForVersion,
	versionToTypeName,
	getPackageName,
	buildDiscriminatorTree,
	extractAIInputTypesFromBuilderHint,
} from './generate-types';

// =============================================================================
// Constants
// =============================================================================

/**
 * Known values for genericAuthType in HTTP Request node
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
 * TypeScript reserved words that need quoting
 */
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
 * Mapping from AI input types to their corresponding Zod schema info
 * Used for generating subnode configuration schemas
 */
const AI_TYPE_TO_SCHEMA_FIELD: Record<
	string,
	{
		fieldName: string;
		schemaName: string;
		isArray: boolean;
		canBeMultiple: boolean; // Whether it can be single or array (like model)
	}
> = {
	ai_languageModel: {
		fieldName: 'model',
		schemaName: 'languageModelInstanceSchema',
		isArray: false,
		canBeMultiple: true,
	},
	ai_memory: {
		fieldName: 'memory',
		schemaName: 'memoryInstanceSchema',
		isArray: false,
		canBeMultiple: false,
	},
	ai_tool: {
		fieldName: 'tools',
		schemaName: 'toolInstanceSchema',
		isArray: true,
		canBeMultiple: false,
	},
	ai_outputParser: {
		fieldName: 'outputParser',
		schemaName: 'outputParserInstanceSchema',
		isArray: false,
		canBeMultiple: false,
	},
	ai_embedding: {
		fieldName: 'embedding',
		schemaName: 'embeddingInstanceSchema',
		isArray: false,
		canBeMultiple: true,
	},
	ai_vectorStore: {
		fieldName: 'vectorStore',
		schemaName: 'vectorStoreInstanceSchema',
		isArray: false,
		canBeMultiple: false,
	},
	ai_retriever: {
		fieldName: 'retriever',
		schemaName: 'retrieverInstanceSchema',
		isArray: false,
		canBeMultiple: false,
	},
	ai_document: {
		fieldName: 'documentLoader',
		schemaName: 'documentLoaderInstanceSchema',
		isArray: false,
		canBeMultiple: true,
	},
	ai_textSplitter: {
		fieldName: 'textSplitter',
		schemaName: 'textSplitterInstanceSchema',
		isArray: false,
		canBeMultiple: false,
	},
	ai_reranker: {
		fieldName: 'reranker',
		schemaName: 'rerankerInstanceSchema',
		isArray: false,
		canBeMultiple: false,
	},
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if any AI input types have required fields.
 * Used to determine if the `subnodes` field itself should be optional or required.
 */
function hasRequiredSubnodeFields(aiInputTypes: AIInputTypeInfo[]): boolean {
	return aiInputTypes.some((input) => input.required);
}

/**
 * Check if any properties have displayOptions.
 * Used to determine if we need to generate a factory function instead of static schema.
 */
function hasDisplayOptions(properties: NodeProperty[]): boolean {
	return properties.some((prop) => prop.displayOptions !== undefined);
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
		return '';
	}
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
 * Format a literal value for use in Zod schema
 */
function formatZodLiteral(value: unknown): string {
	if (typeof value === 'string') {
		// Escape special characters
		const escaped = value
			.replace(/\\/g, '\\\\')
			.replace(/'/g, "\\'")
			.replace(/\n/g, '\\n')
			.replace(/\r/g, '\\r')
			.replace(/\t/g, '\\t');
		return `'${escaped}'`;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	return JSON.stringify(value);
}

/**
 * Quote property name if needed for object schemas
 */
function quotePropertyName(name: string): string {
	const needsQuoting = RESERVED_WORDS.has(name) || !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
	if (needsQuoting) {
		return `'${name.replace(/'/g, "\\'")}'`;
	}
	return name;
}

// =============================================================================
// Property to Zod Schema Mapping
// =============================================================================

/**
 * Map a nested property to its Zod schema code (for collection/fixedCollection inner properties)
 */
function mapNestedPropertyToZodSchema(prop: NodeProperty): string {
	// Skip display-only types
	if (['notice', 'curlImport', 'credentials'].includes(prop.type)) {
		return '';
	}

	// Handle dynamic options
	if (prop.typeOptions?.loadOptionsMethod || prop.typeOptions?.loadOptionsDependsOn) {
		if (prop.type === 'multiOptions') {
			return 'z.array(z.string())';
		}
		return 'stringOrExpression';
	}

	switch (prop.type) {
		case 'string':
		case 'dateTime':
		case 'color':
		case 'credentialsSelect':
			return 'stringOrExpression';

		case 'number':
			return 'numberOrExpression';

		case 'boolean':
			return 'booleanOrExpression';

		case 'options':
			if (prop.options && prop.options.length > 0) {
				const literals = prop.options
					.filter((opt) => opt.value !== undefined)
					.map((opt) => `z.literal(${formatZodLiteral(opt.value)})`);
				if (literals.length > 0) {
					return `z.union([${literals.join(', ')}, expressionSchema])`;
				}
			}
			return 'stringOrExpression';

		case 'multiOptions':
			if (prop.options && prop.options.length > 0) {
				const literals = prop.options
					.filter((opt) => opt.value !== undefined)
					.map((opt) => `z.literal(${formatZodLiteral(opt.value)})`);
				if (literals.length > 0) {
					return `z.array(z.union([${literals.join(', ')}]))`;
				}
			}
			return 'z.array(z.string())';

		case 'json':
			return 'z.union([iDataObjectSchema, z.string()])';

		case 'resourceLocator':
			return 'resourceLocatorValueSchema';

		case 'filter':
			return 'filterValueSchema';

		case 'assignmentCollection':
			return 'assignmentCollectionValueSchema';

		case 'hidden':
			return 'z.unknown()';

		default:
			return 'z.unknown()';
	}
}

/**
 * Generate Zod schema for a fixedCollection property
 */
function generateFixedCollectionZodSchema(prop: NodeProperty): string {
	if (!prop.options || prop.options.length === 0) {
		return 'z.record(z.string(), z.unknown())';
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
			if (['notice', 'curlImport', 'credentials'].includes(nestedProp.type)) {
				continue;
			}

			const nestedSchema = mapNestedPropertyToZodSchema(nestedProp);
			if (nestedSchema) {
				const quotedName = quotePropertyName(nestedProp.name);
				nestedProps.push(`${quotedName}: ${nestedSchema}.optional()`);
			}
		}

		if (nestedProps.length > 0) {
			const innerSchema = `z.object({ ${nestedProps.join(', ')} })`;
			const groupSchema = isMultipleValues ? `z.array(${innerSchema})` : innerSchema;
			groups.push(`${groupName}: ${groupSchema}.optional()`);
		}
	}

	if (groups.length === 0) {
		return 'z.record(z.string(), z.unknown())';
	}

	return `z.object({ ${groups.join(', ')} })`;
}

/**
 * Generate Zod schema for a collection property
 */
function generateCollectionZodSchema(prop: NodeProperty): string {
	if (!prop.options || prop.options.length === 0) {
		return 'z.record(z.string(), z.unknown())';
	}

	const nestedProps: string[] = [];

	for (const nestedProp of prop.options) {
		// Skip if this is a group (has values array)
		if (nestedProp.values !== undefined) {
			continue;
		}

		// Cast to NodeProperty since collection options are actually NodeProperty-like
		const asNodeProp = nestedProp as unknown as NodeProperty;
		if (['notice', 'curlImport', 'credentials'].includes(asNodeProp.type)) {
			continue;
		}

		const nestedSchema = mapNestedPropertyToZodSchema(asNodeProp);
		if (nestedSchema) {
			const quotedName = quotePropertyName(nestedProp.name);
			nestedProps.push(`${quotedName}: ${nestedSchema}.optional()`);
		}
	}

	if (nestedProps.length === 0) {
		return 'z.record(z.string(), z.unknown())';
	}

	return `z.object({ ${nestedProps.join(', ')} })`;
}

/**
 * Map n8n property type to Zod schema code string
 *
 * This function parallels mapPropertyType() but returns Zod schema code
 * that validates the runtime representation of values (where expressions
 * are strings like "={{ $json.field }}").
 */
export function mapPropertyToZodSchema(prop: NodeProperty): string {
	// Special handling for known credentialsSelect fields with fixed values
	if (prop.type === 'credentialsSelect' && prop.name === 'genericAuthType') {
		const literals = GENERIC_AUTH_TYPE_VALUES.map((v) => `z.literal('${v}')`);
		return `z.union([${literals.join(', ')}, expressionSchema])`;
	}

	// Handle dynamic options (loadOptionsMethod)
	if (prop.typeOptions?.loadOptionsMethod || prop.typeOptions?.loadOptionsDependsOn) {
		switch (prop.type) {
			case 'options':
				return 'stringOrExpression';
			case 'multiOptions':
				return 'z.array(z.string())';
			default:
				return 'stringOrExpression';
		}
	}

	switch (prop.type) {
		case 'string':
			return 'stringOrExpression';

		case 'number':
			return 'numberOrExpression';

		case 'boolean':
			return 'booleanOrExpression';

		case 'options':
			if (prop.options && prop.options.length > 0) {
				const literals = prop.options
					.filter((opt) => opt.value !== undefined)
					.map((opt) => `z.literal(${formatZodLiteral(opt.value)})`);
				if (literals.length > 0) {
					return `z.union([${literals.join(', ')}, expressionSchema])`;
				}
			}
			return 'stringOrExpression';

		case 'multiOptions':
			if (prop.options && prop.options.length > 0) {
				const literals = prop.options
					.filter((opt) => opt.value !== undefined)
					.map((opt) => `z.literal(${formatZodLiteral(opt.value)})`);
				if (literals.length > 0) {
					return `z.array(z.union([${literals.join(', ')}]))`;
				}
			}
			return 'z.array(z.string())';

		case 'json':
			return 'z.union([iDataObjectSchema, z.string()])';

		case 'resourceLocator':
			return 'resourceLocatorValueSchema';

		case 'filter':
			return 'filterValueSchema';

		case 'assignmentCollection':
			return 'assignmentCollectionValueSchema';

		case 'fixedCollection':
			return generateFixedCollectionZodSchema(prop);

		case 'collection':
			return generateCollectionZodSchema(prop);

		case 'dateTime':
		case 'color':
			return 'stringOrExpression';

		case 'hidden':
			return 'z.unknown()';

		case 'notice':
		case 'curlImport':
		case 'credentials':
			return ''; // Skip these types

		case 'credentialsSelect':
			return 'stringOrExpression';

		default:
			return 'z.unknown()';
	}
}

/**
 * Generate a Zod schema property line
 */
export function generateSchemaPropertyLine(prop: NodeProperty, optional: boolean): string {
	const zodSchema = mapPropertyToZodSchema(prop);
	if (!zodSchema) {
		return '';
	}

	const propName = quotePropertyName(prop.name);
	const schema = optional ? `${zodSchema}.optional()` : zodSchema;
	return `\t${propName}: ${schema},`;
}

/**
 * Strip discriminator keys from displayOptions.
 * Used to remove resource/operation/version keys from displayOptions since
 * the discriminator file split already handles those conditions.
 *
 * @param displayOptions - The original displayOptions with show/hide conditions
 * @param discriminatorKeys - Keys to strip (e.g., ['resource', 'operation'])
 * @returns Cleaned displayOptions or undefined if all conditions were stripped
 */
export function stripDiscriminatorKeysFromDisplayOptions(
	displayOptions: { show?: Record<string, unknown[]>; hide?: Record<string, unknown[]> },
	discriminatorKeys: string[],
): { show?: Record<string, unknown[]>; hide?: Record<string, unknown[]> } | undefined {
	const result: { show?: Record<string, unknown[]>; hide?: Record<string, unknown[]> } = {};

	if (displayOptions.show) {
		const cleanedShow: Record<string, unknown[]> = {};
		for (const [key, values] of Object.entries(displayOptions.show)) {
			if (!discriminatorKeys.includes(key)) {
				cleanedShow[key] = values;
			}
		}
		if (Object.keys(cleanedShow).length > 0) {
			result.show = cleanedShow;
		}
	}

	if (displayOptions.hide) {
		const cleanedHide: Record<string, unknown[]> = {};
		for (const [key, values] of Object.entries(displayOptions.hide)) {
			if (!discriminatorKeys.includes(key)) {
				cleanedHide[key] = values;
			}
		}
		if (Object.keys(cleanedHide).length > 0) {
			result.hide = cleanedHide;
		}
	}

	if (!result.show && !result.hide) {
		return undefined;
	}
	return result;
}

/**
 * Generate a conditional schema property line using resolveSchema helper.
 * Used for properties that have displayOptions (conditionally shown/hidden fields).
 *
 * @param prop - The property with displayOptions
 * @returns Generated code line for the property using resolveSchema
 */
export function generateConditionalSchemaLine(prop: NodeProperty): string {
	const zodSchema = mapPropertyToZodSchema(prop);
	if (!zodSchema) {
		return '';
	}

	const propName = quotePropertyName(prop.name);
	const required = prop.required ?? false;
	const displayOptionsStr = JSON.stringify(prop.displayOptions);

	return `\t${propName}: resolveSchema({ parameters, schema: ${zodSchema}, required: ${required}, displayOptions: ${displayOptionsStr} }),`;
}

// =============================================================================
// Schema Generation Result Types
// =============================================================================

export interface SchemaGenerationResult {
	/** The generated schema code */
	code: string;
	/** Information about each schema for linking with types */
	schemaInfos: SchemaInfo[];
}

export interface SchemaInfo {
	/** The schema name (e.g., "SetV34ConfigSchema") */
	schemaName: string;
	/** The corresponding type name (e.g., "SetV34Config") */
	typeName: string;
	/** Resource discriminator value if applicable */
	resource?: string;
	/** Operation discriminator value if applicable */
	operation?: string;
	/** All discriminator key-value pairs */
	discriminators: Record<string, string>;
}

// =============================================================================
// Subnode Schema Generation
// =============================================================================

/**
 * Generate Zod schema code for subnode configuration (AI nodes only).
 * Returns null if no AI inputs are present.
 *
 * @param aiInputTypes Array of AI input types with required status
 * @param schemaName The base schema name to use for the subnode config schema
 * @returns Zod schema code string or null if no AI inputs
 */
export function generateSubnodeConfigSchemaCode(
	aiInputTypes: AIInputTypeInfo[],
	schemaName: string,
): string | null {
	if (aiInputTypes.length === 0) {
		return null;
	}

	const lines: string[] = [];
	lines.push(`export const ${schemaName}SubnodeConfigSchema = z.object({`);

	for (const aiInput of aiInputTypes) {
		const fieldInfo = AI_TYPE_TO_SCHEMA_FIELD[aiInput.type];
		if (!fieldInfo) {
			continue;
		}

		let schemaStr: string;
		if (fieldInfo.isArray) {
			// Always an array (e.g., tools)
			schemaStr = `z.array(${fieldInfo.schemaName})`;
		} else if (fieldInfo.canBeMultiple) {
			// Can be single or array (e.g., model, embedding, documentLoader)
			schemaStr = `z.union([${fieldInfo.schemaName}, z.array(${fieldInfo.schemaName})])`;
		} else {
			// Single value only
			schemaStr = fieldInfo.schemaName;
		}

		// Mark field as optional if not required
		if (!aiInput.required) {
			schemaStr = `${schemaStr}.optional()`;
		}

		lines.push(`\t${fieldInfo.fieldName}: ${schemaStr},`);
	}

	lines.push('});');

	return lines.join('\n');
}

/**
 * Get the schema imports needed for a set of AI input types.
 * Returns array of schema names to import from base.schema.ts
 *
 * @param aiInputTypes Array of AI input types
 * @returns Array of schema names to import
 */
export function getSubnodeSchemaImports(aiInputTypes: AIInputTypeInfo[]): string[] {
	const imports: string[] = [];

	for (const aiInput of aiInputTypes) {
		const fieldInfo = AI_TYPE_TO_SCHEMA_FIELD[aiInput.type];
		if (fieldInfo && !imports.includes(fieldInfo.schemaName)) {
			imports.push(fieldInfo.schemaName);
		}
	}

	return imports;
}

// =============================================================================
// Schema File Generation
// =============================================================================

/**
 * Generate Zod schema file content for a single version of a node
 *
 * This parallels generateSingleVersionTypeFile() but outputs Zod schemas.
 *
 * @param node The node type description
 * @param specificVersion The specific version number to generate for
 */
export function generateSingleVersionSchemaFile(
	node: NodeTypeDescription,
	specificVersion: number,
): string {
	const prefix = getPackagePrefix(node.name);
	const nodeName = prefix + toPascalCase(getNodeBaseName(node.name));
	const versionSuffix = versionToTypeName(specificVersion);

	// Filter properties for this version
	const filteredProperties = filterPropertiesForVersion(node.properties, specificVersion);

	// Create filtered node for combination extraction
	const filteredNode: NodeTypeDescription = {
		...node,
		properties: filteredProperties,
		version: specificVersion,
	};

	// Extract AI input types for subnode schema
	const aiInputTypes = extractAIInputTypesFromBuilderHint(filteredNode);
	const subnodeSchemaImports = getSubnodeSchemaImports(aiInputTypes);

	// Check if we need to generate factory functions (properties with displayOptions)
	const needsFactoryFunction = hasDisplayOptions(filteredProperties);

	const lines: string[] = [];

	// Header
	lines.push('/**');
	lines.push(` * ${node.displayName} Node - Version ${specificVersion} - Zod Validation Schemas`);
	lines.push(' *');
	lines.push(' * These schemas validate node configuration at runtime.');
	lines.push(' * Use .parse() for strict validation or .safeParse() for error handling.');
	lines.push(' */');
	lines.push('');

	// Imports
	// Path from nodes/n8n-nodes-base/nodeName/v1.schema.ts to generated-types/base.schema.ts
	// is ../../../base.schema (3 levels: nodeName -> package -> nodes -> generated-types)
	lines.push("import { z } from 'zod';");
	lines.push('import {');
	lines.push('\texpressionSchema,');
	lines.push('\tstringOrExpression,');
	lines.push('\tnumberOrExpression,');
	lines.push('\tbooleanOrExpression,');
	lines.push('\tresourceLocatorValueSchema,');
	lines.push('\tfilterValueSchema,');
	lines.push('\tassignmentCollectionValueSchema,');
	lines.push('\tiDataObjectSchema,');

	// Add resolveSchema import if we need factory functions
	if (needsFactoryFunction) {
		lines.push('\tresolveSchema,');
	}

	// Add subnode schema imports if this is an AI node
	for (const schemaImport of subnodeSchemaImports) {
		lines.push(`\t${schemaImport},`);
	}

	lines.push("} from '../../../base.schema';");
	lines.push('');

	// Generate schemas section
	lines.push('// ' + '='.repeat(75));
	lines.push('// Validation Schemas');
	lines.push('// ' + '='.repeat(75));
	lines.push('');

	// Generate schemas using the same logic as type generation
	const schemaResult = generateSchemasForNode(
		filteredNode,
		nodeName,
		versionSuffix,
		aiInputTypes,
		needsFactoryFunction,
	);
	lines.push(schemaResult.code);

	return lines.join('\n');
}

/**
 * Generate Zod schemas for a node (handles both flat and discriminated patterns)
 *
 * Generates:
 * - ParametersSchema: validates the parameters object (static or factory)
 * - SubnodeConfigSchema: validates AI subnode configuration (if AI node)
 * - ConfigSchema: combined schema wrapping parameters + subnodes
 *
 * When useFactoryFunction is true, generates factory functions like:
 *   export function getNodeNameV1ParametersSchema({ parameters, resolveSchema }) { ... }
 *
 * This enables dynamic schema resolution for fields with displayOptions.
 */
function generateSchemasForNode(
	node: NodeTypeDescription,
	nodeName: string,
	versionSuffix: string,
	aiInputTypes: AIInputTypeInfo[],
	useFactoryFunction: boolean = false,
): SchemaGenerationResult {
	const combinations = extractDiscriminatorCombinations(node);
	const lines: string[] = [];
	const schemaInfos: SchemaInfo[] = [];
	const hasAiInputs = aiInputTypes.length > 0;
	const baseSchemaName = `${nodeName}${versionSuffix}`;

	if (combinations.length === 0) {
		// No discriminators - generate simple schema
		const parametersSchemaName = `${baseSchemaName}ParametersSchema`;
		const parametersFactoryName = `get${baseSchemaName}ParametersSchema`;
		const configSchemaName = `${baseSchemaName}ConfigSchema`;
		const configFactoryName = `get${baseSchemaName}ConfigSchema`;
		const typeName = `${baseSchemaName}Config`;

		if (useFactoryFunction) {
			// Generate Parameters Schema Factory Function
			lines.push(
				`export function ${parametersFactoryName}({ parameters, resolveSchema }: { parameters: Record<string, unknown>; resolveSchema: typeof import('../../../base.schema').resolveSchema }) {`,
			);
			lines.push('\treturn z.object({');

			const seenNames = new Set<string>();
			for (const prop of node.properties) {
				if (['notice', 'curlImport', 'credentials'].includes(prop.type)) {
					continue;
				}
				if (seenNames.has(prop.name)) {
					continue;
				}
				seenNames.add(prop.name);

				// Use conditional schema line for properties with displayOptions
				if (prop.displayOptions) {
					const propLine = generateConditionalSchemaLine(prop);
					if (propLine) {
						lines.push(propLine);
					}
				} else {
					const propLine = generateSchemaPropertyLine(prop, !prop.required);
					if (propLine) {
						lines.push(propLine);
					}
				}
			}

			lines.push('\t});');
			lines.push('}');
			lines.push('');

			// Generate Subnode Config Schema (if AI node)
			if (hasAiInputs) {
				const subnodeCode = generateSubnodeConfigSchemaCode(aiInputTypes, baseSchemaName);
				if (subnodeCode) {
					lines.push(subnodeCode);
					lines.push('');
				}
			}

			// Generate Combined Config Schema Factory Function
			lines.push(`// Combined config schema factory (parameters + subnodes)`);
			lines.push(
				`export function ${configFactoryName}({ parameters, resolveSchema }: { parameters: Record<string, unknown>; resolveSchema: typeof import('../../../base.schema').resolveSchema }) {`,
			);
			lines.push('\treturn z.object({');
			lines.push(
				`\t\tparameters: ${parametersFactoryName}({ parameters, resolveSchema }).optional(),`,
			);
			if (hasAiInputs) {
				const subnodesOptional = !hasRequiredSubnodeFields(aiInputTypes);
				lines.push(
					`\t\tsubnodes: ${baseSchemaName}SubnodeConfigSchema${subnodesOptional ? '.optional()' : ''},`,
				);
			}
			lines.push(`\t\t// TODO: Add other NodeConfig fields (disabled, retryOnFail, etc.)`);
			lines.push('\t});');
			lines.push('}');
			lines.push('');
			lines.push('// TODO: Add credentials schema');
			lines.push('// TODO: Add full node schema (type, version, credentials, config)');
		} else {
			// Generate static Parameters Schema
			lines.push(`export const ${parametersSchemaName} = z.object({`);

			const seenNames = new Set<string>();
			for (const prop of node.properties) {
				if (['notice', 'curlImport', 'credentials'].includes(prop.type)) {
					continue;
				}
				if (seenNames.has(prop.name)) {
					continue;
				}
				seenNames.add(prop.name);
				const propLine = generateSchemaPropertyLine(prop, !prop.required);
				if (propLine) {
					lines.push(propLine);
				}
			}

			lines.push('});');
			lines.push('');

			// Generate Subnode Config Schema (if AI node)
			if (hasAiInputs) {
				const subnodeCode = generateSubnodeConfigSchemaCode(aiInputTypes, baseSchemaName);
				if (subnodeCode) {
					lines.push(subnodeCode);
					lines.push('');
				}
			}

			// Generate Combined Config Schema
			lines.push(`// Combined config schema (parameters + subnodes)`);
			lines.push(`export const ${configSchemaName} = z.object({`);
			lines.push(`\tparameters: ${parametersSchemaName}.optional(),`);
			if (hasAiInputs) {
				const subnodesOptional = !hasRequiredSubnodeFields(aiInputTypes);
				lines.push(
					`\tsubnodes: ${baseSchemaName}SubnodeConfigSchema${subnodesOptional ? '.optional()' : ''},`,
				);
			}
			lines.push(`\t// TODO: Add other NodeConfig fields (disabled, retryOnFail, etc.)`);
			lines.push('});');
			lines.push('');
			lines.push(`export type ${typeName}Validated = z.infer<typeof ${configSchemaName}>;`);
			lines.push('');
			lines.push('// TODO: Add credentials schema');
			lines.push('// TODO: Add full node schema (type, version, credentials, config)');
		}

		schemaInfos.push({
			schemaName: useFactoryFunction ? configFactoryName : configSchemaName,
			typeName,
			discriminators: {},
		});

		return { code: lines.join('\n'), schemaInfos };
	}

	// Generate individual schemas for each combination
	const parametersSchemaNames: string[] = [];
	const configSchemaNames: string[] = [];

	for (const combo of combinations) {
		const comboValues = Object.entries(combo)
			.filter(([_, v]) => v !== undefined)
			.map(([_, v]) => toPascalCase(v!));
		const comboSuffix = comboValues.join('');
		const parametersSchemaName = `${baseSchemaName}${comboSuffix}ParametersSchema`;
		const configSchemaName = `${baseSchemaName}${comboSuffix}ConfigSchema`;
		const typeName = `${baseSchemaName}${comboSuffix}Config`;
		parametersSchemaNames.push(parametersSchemaName);
		configSchemaNames.push(configSchemaName);

		// Track schema info (using the combined config schema name)
		const schemaInfo: SchemaInfo = {
			schemaName: configSchemaName,
			typeName,
			resource: combo.resource,
			operation: combo.operation,
			discriminators: {},
		};
		for (const [key, value] of Object.entries(combo)) {
			if (value !== undefined) {
				schemaInfo.discriminators[key] = value;
			}
		}
		schemaInfos.push(schemaInfo);

		// Get properties for this combination
		const props = getPropertiesForCombination(node, combo);

		// Generate Parameters Schema
		lines.push(`export const ${parametersSchemaName} = z.object({`);

		// Add discriminator fields as literals
		for (const [key, value] of Object.entries(combo)) {
			if (value !== undefined) {
				lines.push(`\t${key}: z.literal('${value}'),`);
			}
		}

		// Add other properties
		const seenNames = new Set<string>();
		for (const prop of props) {
			if (seenNames.has(prop.name)) {
				continue;
			}
			seenNames.add(prop.name);
			const propLine = generateSchemaPropertyLine(prop, !prop.required);
			if (propLine) {
				lines.push(propLine);
			}
		}

		lines.push('});');
		lines.push('');

		// Generate Combined Config Schema for this combination
		lines.push(`export const ${configSchemaName} = z.object({`);
		lines.push(`\tparameters: ${parametersSchemaName}.optional(),`);
		if (hasAiInputs) {
			const subnodesOptional = !hasRequiredSubnodeFields(aiInputTypes);
			lines.push(
				`\tsubnodes: ${baseSchemaName}SubnodeConfigSchema${subnodesOptional ? '.optional()' : ''},`,
			);
		}
		lines.push(`\t// TODO: Add other NodeConfig fields`);
		lines.push('});');
		lines.push('');
	}

	// Generate Subnode Config Schema (shared across combinations if AI node)
	if (hasAiInputs) {
		const subnodeCode = generateSubnodeConfigSchemaCode(aiInputTypes, baseSchemaName);
		if (subnodeCode) {
			// Insert subnode schema before the combination schemas
			const subnodeLines = [subnodeCode, ''];
			lines.splice(0, 0, ...subnodeLines);
		}
	}

	// Generate union schema for parameters
	const unionParametersSchemaName = `${baseSchemaName}ParametersSchema`;
	if (parametersSchemaNames.length === 1) {
		lines.push(`export const ${unionParametersSchemaName} = ${parametersSchemaNames[0]};`);
	} else {
		lines.push(`export const ${unionParametersSchemaName} = z.union([`);
		for (const name of parametersSchemaNames) {
			lines.push(`\t${name},`);
		}
		lines.push(']);');
	}
	lines.push('');

	// Generate union schema for combined config
	const unionConfigSchemaName = `${baseSchemaName}ConfigSchema`;
	if (configSchemaNames.length === 1) {
		lines.push(`export const ${unionConfigSchemaName} = ${configSchemaNames[0]};`);
	} else {
		lines.push(`export const ${unionConfigSchemaName} = z.union([`);
		for (const name of configSchemaNames) {
			lines.push(`\t${name},`);
		}
		lines.push(']);');
	}
	lines.push('');
	lines.push(
		`export type ${baseSchemaName}ConfigValidated = z.infer<typeof ${unionConfigSchemaName}>;`,
	);
	lines.push('');
	lines.push('// TODO: Add credentials schema');
	lines.push('// TODO: Add full node schema (type, version, credentials, config)');

	return { code: lines.join('\n'), schemaInfos };
}

/**
 * Generate the base.schema.ts file that contains all Zod helper schemas
 * This is a standalone file that can be used without the SDK source
 */
export function generateBaseSchemaFile(): string {
	return `/**
 * Base Zod Schema Helpers
 *
 * Common Zod schemas for n8n node configuration validation.
 * Import from this file in generated schemas.
 *
 * @generated
 */

import { z } from 'zod';

// =============================================================================
// Expression Pattern
// =============================================================================

/**
 * Pattern for n8n expressions: strings starting with ={{
 */
export const expressionPattern = /^={{.*}}$/s;

/**
 * Zod schema for an n8n expression string
 */
export const expressionSchema = z.string().regex(expressionPattern, 'Must be an n8n expression (={{...}})');

// =============================================================================
// Primitive Type Schemas with Expression Support
// =============================================================================

/**
 * String value or n8n expression
 */
export const stringOrExpression = z.string();

/**
 * Number value or n8n expression
 */
export const numberOrExpression = z.union([
	z.number(),
	expressionSchema,
]);

/**
 * Boolean value or n8n expression
 */
export const booleanOrExpression = z.union([
	z.boolean(),
	expressionSchema,
]);

// =============================================================================
// Complex Type Schemas
// =============================================================================

/**
 * Resource Locator Value schema
 */
export const resourceLocatorValueSchema = z.object({
	__rl: z.literal(true),
	mode: z.string(),
	value: z.union([z.string(), z.number()]),
	cachedResultName: z.string().optional(),
	cachedResultUrl: z.string().optional(),
});

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
 */
export const filterValueSchema = z.object({
	conditions: z.array(filterConditionSchema),
	combinator: z.enum(['and', 'or']).optional(),
});

/**
 * Assignment schema
 */
export const assignmentSchema = z.object({
	id: z.string(),
	name: z.string(),
	value: z.unknown(),
	type: z.string().optional(),
});

/**
 * Assignment Collection Value schema
 */
export const assignmentCollectionValueSchema = z.object({
	assignments: z.array(assignmentSchema),
});

/**
 * IDataObject schema - generic data object
 */
export const iDataObjectSchema: z.ZodType<Record<string, unknown>> = z.record(
	z.string(),
	z.unknown(),
);

// =============================================================================
// Subnode Instance Schemas
// =============================================================================

/**
 * Base schema for a subnode instance.
 * Used for AI subnodes like language models, tools, memory, etc.
 */
export const subnodeInstanceBaseSchema = z.object({
	type: z.string(),
	version: z.number(),
	config: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Language Model subnode instance (ai_languageModel)
 */
export const languageModelInstanceSchema = subnodeInstanceBaseSchema;

/**
 * Memory subnode instance (ai_memory)
 */
export const memoryInstanceSchema = subnodeInstanceBaseSchema;

/**
 * Tool subnode instance (ai_tool)
 */
export const toolInstanceSchema = subnodeInstanceBaseSchema;

/**
 * Output Parser subnode instance (ai_outputParser)
 */
export const outputParserInstanceSchema = subnodeInstanceBaseSchema;

/**
 * Embedding subnode instance (ai_embedding)
 */
export const embeddingInstanceSchema = subnodeInstanceBaseSchema;

/**
 * Vector Store subnode instance (ai_vectorStore)
 */
export const vectorStoreInstanceSchema = subnodeInstanceBaseSchema;

/**
 * Retriever subnode instance (ai_retriever)
 */
export const retrieverInstanceSchema = subnodeInstanceBaseSchema;

/**
 * Document Loader subnode instance (ai_document)
 */
export const documentLoaderInstanceSchema = subnodeInstanceBaseSchema;

/**
 * Text Splitter subnode instance (ai_textSplitter)
 */
export const textSplitterInstanceSchema = subnodeInstanceBaseSchema;

/**
 * Reranker subnode instance (ai_reranker)
 */
export const rerankerInstanceSchema = subnodeInstanceBaseSchema;

// =============================================================================
// Dynamic Schema Resolution (for displayOptions support)
// =============================================================================

/**
 * Display options for conditional field visibility
 */
export type DisplayOptions = {
	show?: Record<string, unknown[]>;
	hide?: Record<string, unknown[]>;
};

/**
 * Check if a field should be visible based on displayOptions and current parameter values
 */
export function matchesDisplayOptions(
	parameters: Record<string, unknown>,
	displayOptions: DisplayOptions,
): boolean {
	if (displayOptions.show) {
		for (const [key, allowedValues] of Object.entries(displayOptions.show)) {
			if (!allowedValues.includes(parameters[key])) {
				return false;
			}
		}
	}

	if (displayOptions.hide) {
		for (const [key, hiddenValues] of Object.entries(displayOptions.hide)) {
			if (hiddenValues.includes(parameters[key])) {
				return false;
			}
		}
	}

	return true;
}

/**
 * Configuration for resolveSchema function
 */
export type ResolveSchemaConfig = {
	parameters: Record<string, unknown>;
	schema: z.ZodTypeAny;
	required: boolean;
	displayOptions: DisplayOptions;
};

/**
 * Resolve a schema dynamically based on displayOptions and current parameter values.
 *
 * When field is visible (displayOptions match):
 *   - Returns required schema if required=true
 *   - Returns optional schema if required=false
 *
 * When field is not visible (displayOptions don't match):
 *   - Returns z.unknown().optional() to accept any value without validation
 */
export function resolveSchema({
	parameters,
	schema,
	required,
	displayOptions,
}: ResolveSchemaConfig): z.ZodTypeAny {
	const isVisible = matchesDisplayOptions(parameters, displayOptions);

	if (isVisible) {
		return required ? schema : schema.optional();
	} else {
		return z.unknown().optional();
	}
}
`;
}

/**
 * Generate schema index file content for a node directory
 */
export function generateSchemaIndexFile(node: NodeTypeDescription, versions: number[]): string {
	const sortedVersions = [...versions].sort((a, b) => b - a);

	const lines: string[] = [];

	lines.push('/**');
	lines.push(` * ${node.displayName} Node Schemas`);
	lines.push(' *');
	lines.push(' * Re-exports all version-specific Zod validation schemas.');
	lines.push(' */');
	lines.push('');

	// Re-export from each version
	for (const version of sortedVersions) {
		const fileName = `v${String(version).replace('.', '')}`;
		lines.push(`export * from './${fileName}.schema';`);
	}

	return lines.join('\n');
}

// =============================================================================
// Split Version Schema Generation (for nodes with resource/operation discriminators)
// =============================================================================

/**
 * Generate a Zod schema file for a single discriminator combination (e.g., ticket/get)
 *
 * Always exports a factory function (export default) for consistency.
 * This allows index files to uniformly call all schema factories.
 *
 * @param node The node type description
 * @param version The specific version number
 * @param combo The discriminator combination (e.g., { resource: 'ticket', operation: 'get' })
 * @param props Properties applicable to this combination
 * @param importDepth How many levels deep (for import paths to base.schema.ts)
 * @param aiInputTypes AI input types for this node (for subnode schema reference)
 */
export function generateDiscriminatorSchemaFile(
	node: NodeTypeDescription,
	version: number,
	combo: DiscriminatorCombination,
	props: NodeProperty[],
	importDepth: number,
	aiInputTypes: AIInputTypeInfo[] = [],
): string {
	const hasAiInputs = aiInputTypes.length > 0;
	const prefix = getPackagePrefix(node.name);
	const nodeName = prefix + toPascalCase(getNodeBaseName(node.name));
	const versionSuffix = versionToTypeName(version);
	const baseSchemaName = `${nodeName}${versionSuffix}`;

	// Get discriminator keys to strip from displayOptions
	const discriminatorKeys = Object.keys(combo).filter((k) => combo[k] !== undefined);

	// Check if any properties have remaining displayOptions after stripping discriminators
	const hasRemainingDisplayOptions = props.some((prop) => {
		if (!prop.displayOptions) return false;
		const stripped = stripDiscriminatorKeysFromDisplayOptions(
			prop.displayOptions,
			discriminatorKeys,
		);
		return stripped !== undefined;
	});

	const lines: string[] = [];

	// Build description from discriminator values
	const comboDesc = Object.entries(combo)
		.filter(([_, v]) => v !== undefined)
		.map(([k, v]) => `${k}=${v}`)
		.join(', ');

	// Header
	lines.push('/**');
	lines.push(` * ${node.displayName} Node - Version ${version} - Zod Schema`);
	lines.push(` * Discriminator: ${comboDesc}`);
	lines.push(' *');
	lines.push(' * Use .parse() for strict validation or .safeParse() for error handling.');
	lines.push(' */');
	lines.push('');

	// Imports - relative path to base.schema.ts
	const basePath = '../'.repeat(importDepth) + 'base.schema';
	lines.push("import { z } from 'zod';");
	lines.push('import {');
	lines.push('\texpressionSchema,');
	lines.push('\tstringOrExpression,');
	lines.push('\tnumberOrExpression,');
	lines.push('\tbooleanOrExpression,');
	lines.push('\tresourceLocatorValueSchema,');
	lines.push('\tfilterValueSchema,');
	lines.push('\tassignmentCollectionValueSchema,');
	lines.push('\tiDataObjectSchema,');
	if (hasRemainingDisplayOptions) {
		lines.push('\tresolveSchema,');
	}
	lines.push(`} from '${basePath}';`);

	// Import subnode schema from version index if AI node
	if (hasAiInputs) {
		const versionIndexPath = importDepth === 5 ? '../index.schema' : './index.schema';
		lines.push(`import { ${baseSchemaName}SubnodeConfigSchema } from '${versionIndexPath}';`);
	}

	lines.push('');

	// Schema definition - always export default factory function
	lines.push('// ' + '='.repeat(75));
	lines.push('// Validation Schema');
	lines.push('// ' + '='.repeat(75));
	lines.push('');

	lines.push(
		`export default function getSchema({ parameters, resolveSchema }: { parameters: Record<string, unknown>; resolveSchema: typeof import('${basePath}').resolveSchema }) {`,
	);
	lines.push('\treturn z.object({');
	lines.push('\t\tparameters: z.object({');

	// Add discriminator fields as literals
	for (const [key, value] of Object.entries(combo)) {
		if (value !== undefined) {
			lines.push(`\t\t\t${key}: z.literal('${value}'),`);
		}
	}

	// Add other properties
	const seenNames = new Set<string>();
	for (const prop of props) {
		if (seenNames.has(prop.name)) {
			continue;
		}
		seenNames.add(prop.name);

		if (prop.displayOptions) {
			const strippedDisplayOptions = stripDiscriminatorKeysFromDisplayOptions(
				prop.displayOptions,
				discriminatorKeys,
			);
			if (strippedDisplayOptions) {
				const propWithStrippedOptions: NodeProperty = {
					...prop,
					displayOptions: strippedDisplayOptions,
				};
				const propLine = generateConditionalSchemaLine(propWithStrippedOptions);
				if (propLine) {
					lines.push('\t\t' + propLine);
				}
			} else {
				const propLine = generateSchemaPropertyLine(prop, !prop.required);
				if (propLine) {
					lines.push('\t\t' + propLine);
				}
			}
		} else {
			const propLine = generateSchemaPropertyLine(prop, !prop.required);
			if (propLine) {
				lines.push('\t\t' + propLine);
			}
		}
	}

	lines.push('\t\t}).optional(),');

	if (hasAiInputs) {
		const subnodesOptional = !hasRequiredSubnodeFields(aiInputTypes);
		lines.push(
			`\t\tsubnodes: ${baseSchemaName}SubnodeConfigSchema${subnodesOptional ? '.optional()' : ''},`,
		);
	}

	lines.push('\t});');
	lines.push('}');

	return lines.join('\n');
}

/**
 * Generate a Zod schema index file for a resource directory (e.g., resource_ticket/index.schema.ts)
 * Exports a factory function that calls all operation schema factories and unions them.
 *
 * @param node The node type description
 * @param version The specific version number
 * @param resource The resource name
 * @param operations Array of operation names for this resource
 */
export function generateResourceIndexSchemaFile(
	node: NodeTypeDescription,
	version: number,
	resource: string,
	operations: string[],
): string {
	const basePath = '../../../../../base.schema';

	const lines: string[] = [];

	lines.push('/**');
	lines.push(` * ${node.displayName} - ${toPascalCase(resource)} Resource - Zod Schema Factory`);
	lines.push(' * Exports a factory that unions all operation schemas for this resource.');
	lines.push(' */');
	lines.push('');

	lines.push("import { z } from 'zod';");

	// Import default exports from operation schema files
	for (const op of operations.sort()) {
		const fileName = `operation_${toSnakeCase(op)}.schema`;
		const importName = `get${toPascalCase(op)}Schema`;
		lines.push(`import ${importName} from './${fileName}';`);
	}
	lines.push('');

	// Export factory function
	lines.push(
		`export default function getSchema({ parameters, resolveSchema }: { parameters: Record<string, unknown>; resolveSchema: typeof import('${basePath}').resolveSchema }) {`,
	);

	if (operations.length === 1) {
		const importName = `get${toPascalCase(operations[0])}Schema`;
		lines.push(`\treturn ${importName}({ parameters, resolveSchema });`);
	} else {
		lines.push('\treturn z.union([');
		for (const op of operations.sort()) {
			const importName = `get${toPascalCase(op)}Schema`;
			lines.push(`\t\t${importName}({ parameters, resolveSchema }),`);
		}
		lines.push('\t]);');
	}
	lines.push('}');

	return lines.join('\n');
}

/**
 * Generate a version-level index file for split structure schemas (e.g., v1/index.schema.ts)
 * Exports a factory function that unions all discriminator schemas.
 * Also generates the subnode config schema for AI nodes.
 *
 * @param node The node type description
 * @param version The specific version number
 * @param tree The discriminator tree structure
 * @param aiInputTypes AI input types for subnode schema generation
 * @param comboFactoryMap Map tracking which combos need factory functions (unused, all use factories now)
 */
export function generateSplitVersionIndexSchemaFile(
	node: NodeTypeDescription,
	version: number,
	tree: DiscriminatorTree,
	aiInputTypes: AIInputTypeInfo[] = [],
	_comboFactoryMap: Map<string, boolean> = new Map(),
): string {
	const prefix = getPackagePrefix(node.name);
	const nodeName = prefix + toPascalCase(getNodeBaseName(node.name));
	const versionSuffix = versionToTypeName(version);
	const baseSchemaName = `${nodeName}${versionSuffix}`;
	const hasAiInputs = aiInputTypes.length > 0;
	const basePath = '../../../../base.schema';

	const lines: string[] = [];

	lines.push('/**');
	lines.push(` * ${node.displayName} Node - Version ${version} - Zod Schema Factory`);
	lines.push(' * Exports a factory that unions all discriminator schemas.');
	lines.push(' */');
	lines.push('');

	lines.push("import { z } from 'zod';");

	// Add base schema imports if we have AI inputs
	if (hasAiInputs) {
		const subnodeImports = getSubnodeSchemaImports(aiInputTypes);
		if (subnodeImports.length > 0) {
			lines.push('import {');
			for (const schemaImport of subnodeImports) {
				lines.push(`\t${schemaImport},`);
			}
			lines.push(`} from '${basePath}';`);
		}
	}

	// Import default exports from child schemas
	const importNames: string[] = [];
	if (tree.type === 'resource_operation' && tree.resources) {
		for (const [resource] of tree.resources) {
			const resourceDir = `resource_${toSnakeCase(resource)}`;
			const importName = `get${toPascalCase(resource)}Schema`;
			importNames.push(importName);
			lines.push(`import ${importName} from './${resourceDir}/index.schema';`);
		}
	} else if (tree.type === 'single' && tree.discriminatorName && tree.discriminatorValues) {
		const discName = tree.discriminatorName;
		for (const value of tree.discriminatorValues.sort()) {
			const fileName = `${discName}_${toSnakeCase(value)}.schema`;
			const importName = `get${toPascalCase(value)}Schema`;
			importNames.push(importName);
			lines.push(`import ${importName} from './${fileName}';`);
		}
	}
	lines.push('');

	// Generate Subnode Config Schema if AI node (must be defined before it's used)
	if (hasAiInputs) {
		const subnodeCode = generateSubnodeConfigSchemaCode(aiInputTypes, baseSchemaName);
		if (subnodeCode) {
			lines.push('// ' + '='.repeat(75));
			lines.push('// Subnode Configuration Schema');
			lines.push('// ' + '='.repeat(75));
			lines.push('');
			lines.push(subnodeCode);
			lines.push('');
		}
	}

	// Export factory function
	lines.push(
		`export default function getSchema({ parameters, resolveSchema }: { parameters: Record<string, unknown>; resolveSchema: typeof import('${basePath}').resolveSchema }) {`,
	);

	if (importNames.length === 1) {
		lines.push(`\treturn ${importNames[0]}({ parameters, resolveSchema });`);
	} else if (importNames.length > 1) {
		lines.push('\treturn z.union([');
		for (const importName of importNames) {
			lines.push(`\t\t${importName}({ parameters, resolveSchema }),`);
		}
		lines.push('\t]);');
	} else {
		lines.push('\treturn z.object({});');
	}
	lines.push('}');

	return lines.join('\n');
}

/**
 * Plan schema files for a split version directory.
 * Returns a Map of relative file paths to their content, to be merged with type files.
 * All discriminated schema files export factory functions for consistency.
 *
 * @param node The node type description
 * @param version The specific version number
 * @returns Map of relative path -> file content (schema files only)
 */
export function planSplitVersionSchemaFiles(
	node: NodeTypeDescription,
	version: number,
): Map<string, string> {
	const files = new Map<string, string>();

	// Get discriminator combinations
	const combinations = extractDiscriminatorCombinations(node);
	const tree = buildDiscriminatorTree(combinations);

	// Extract AI input types for subnode schema
	const versionFilteredNode: NodeTypeDescription = {
		...node,
		properties: filterPropertiesForVersion(node.properties, version),
		version,
	};
	const aiInputTypes = extractAIInputTypesFromBuilderHint(versionFilteredNode);

	if (tree.type === 'resource_operation' && tree.resources) {
		// Resource/operation pattern: nested directories
		for (const [resource, operations] of tree.resources) {
			const resourceDir = `resource_${toSnakeCase(resource)}`;

			// Generate operation schema files within resource directory
			for (const operation of operations) {
				const combo = { resource, operation };
				const versionFilteredProps = filterPropertiesForVersion(node.properties, version);
				const nodeForCombination = { ...node, properties: versionFilteredProps };
				const props = getPropertiesForCombination(nodeForCombination, combo);
				const fileName = `operation_${toSnakeCase(operation)}.schema.ts`;
				const filePath = `${resourceDir}/${fileName}`;

				// Import depth: 5 levels deep (nodes/pkg/nodeName/version/resource_x/operation.schema.ts -> base.schema)
				const content = generateDiscriminatorSchemaFile(
					node,
					version,
					combo,
					props,
					5,
					aiInputTypes,
				);
				files.set(filePath, content);
			}

			// Generate resource schema index file
			const resourceIndexContent = generateResourceIndexSchemaFile(
				node,
				version,
				resource,
				operations,
			);
			files.set(`${resourceDir}/index.schema.ts`, resourceIndexContent);
		}
	} else if (tree.type === 'single' && tree.discriminatorName && tree.discriminatorValues) {
		// Single discriminator pattern (mode, etc.): flat files
		const discName = tree.discriminatorName;

		for (const value of tree.discriminatorValues) {
			const combo: DiscriminatorCombination = { [discName]: value };
			const versionFilteredProps = filterPropertiesForVersion(node.properties, version);
			const nodeForCombination = { ...node, properties: versionFilteredProps };
			const props = getPropertiesForCombination(nodeForCombination, combo);
			const fileName = `${discName}_${toSnakeCase(value)}.schema.ts`;

			// Import depth: 4 levels deep (nodes/pkg/nodeName/version/mode.schema.ts -> base.schema)
			const content = generateDiscriminatorSchemaFile(node, version, combo, props, 4, aiInputTypes);
			files.set(fileName, content);
		}
	}

	// Generate version schema index file (includes subnode schema for AI nodes)
	files.set(
		'index.schema.ts',
		generateSplitVersionIndexSchemaFile(node, version, tree, aiInputTypes),
	);

	return files;
}
