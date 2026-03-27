/**
 * Zod Schema Generation
 *
 * Generates Zod validation schemas alongside TypeScript types for node configurations.
 * These schemas enable runtime validation of node configs via .parse() or .safeParse().
 *
 * This module parallels generate-types.ts but outputs Zod schemas instead of TypeScript types.
 *
 * IMPORTANT: Generated schema files are CommonJS JavaScript (.schema.js) NOT TypeScript.
 * This allows them to be loaded at runtime via require() without compilation.
 */

import type {
	NodeProperty,
	NodeTypeDescription,
	DiscriminatorCombination,
	DiscriminatorTree,
	AIInputTypeInfo,
} from './generate-types';
// eslint-disable-next-line import-x/no-cycle -- TODO: Refactor shared types/utils to break cycle
import {
	extractDiscriminatorCombinations,
	getPropertiesForCombination,
	filterPropertiesForVersion,
	buildDiscriminatorTree,
	extractAIInputTypesFromBuilderHint,
} from './generate-types';

// =============================================================================
// Constants
// =============================================================================

/** Indentation string for generated code (2 spaces per level) */
const INDENT = '  ';

/** Custom API Call operations don't have fixed schemas - skip them */
const CUSTOM_API_CALL_KEY = '__CUSTOM_API_CALL__';

function isCustomApiCall(operation: string): boolean {
	return operation === CUSTOM_API_CALL_KEY;
}

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
 * Determine if a property should be optional in the schema.
 * A property is optional if it's not required OR if it has a default value.
 * Properties with defaults can be omitted - the default will be used at runtime.
 */
function isPropertyOptional(prop: NodeProperty): boolean {
	const hasDefault = 'default' in prop && prop.default !== undefined;
	return !prop.required || hasDefault;
}

/**
 * Check if any AI input types are unconditionally required.
 * An input is unconditionally required if it has required: true AND no displayOptions.
 * Inputs with displayOptions are conditionally required and don't make subnodes mandatory.
 * Used to determine if the `subnodes` field itself should be optional or required.
 */
function hasRequiredSubnodeFields(aiInputTypes: AIInputTypeInfo[]): boolean {
	return aiInputTypes.some((input) => input.required && !input.displayOptions);
}

/**
 * Check if any AI input types have conditional requirements (displayOptions).
 * Used to determine if SubnodeConfigSchema needs to be a factory function.
 */
function hasConditionalSubnodeFields(aiInputTypes: AIInputTypeInfo[]): boolean {
	return aiInputTypes.some((input) => input.displayOptions);
}

/**
 * Check if any properties have displayOptions that remain after stripping @version.
 * Used to determine if we need to generate a factory function instead of static schema.
 * @version is always stripped since it's implicit in the file path.
 */
function hasDisplayOptions(properties: NodeProperty[]): boolean {
	return properties.some((prop) => {
		if (!prop.displayOptions) return false;
		// Strip @version since it's implicit in the file path
		const stripped = stripDiscriminatorKeysFromDisplayOptions(prop.displayOptions, ['@version']);
		return stripped !== undefined;
	});
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

/**
 * Extract default values for properties referenced in displayOptions.
 * This is used to generate the `defaults` parameter for resolveSchema calls,
 * ensuring that validation uses default values when properties aren't explicitly set.
 *
 * @param displayOptions - The displayOptions containing show/hide conditions
 * @param allProperties - All properties available at this level (to look up defaults)
 * @returns Record of property names to their default values
 */
export function extractDefaultsForDisplayOptions(
	displayOptions: { show?: Record<string, unknown[]>; hide?: Record<string, unknown[]> },
	allProperties: NodeProperty[],
): Record<string, unknown> {
	const defaults: Record<string, unknown> = {};
	const referencedProps = new Set<string>();

	// Collect property names referenced in show conditions
	if (displayOptions.show) {
		for (const key of Object.keys(displayOptions.show)) {
			// Skip meta-properties like @version and root paths
			if (!key.startsWith('@') && !key.startsWith('/')) {
				// Handle nested paths like "options.format" - only use the first part
				const baseProp = key.split('.')[0];
				referencedProps.add(baseProp);
			}
		}
	}

	// Collect property names referenced in hide conditions
	if (displayOptions.hide) {
		for (const key of Object.keys(displayOptions.hide)) {
			// Skip meta-properties like @version and root paths
			if (!key.startsWith('@') && !key.startsWith('/')) {
				const baseProp = key.split('.')[0];
				referencedProps.add(baseProp);
			}
		}
	}

	// Find defaults for referenced properties
	for (const propName of referencedProps) {
		const prop = allProperties.find((p) => p.name === propName);
		if (prop && prop.default !== undefined) {
			defaults[propName] = prop.default;
		}
	}

	return defaults;
}

// =============================================================================
// Property to Zod Schema Mapping
// =============================================================================

/**
 * Generate inline Zod schema for resourceLocator based on available modes
 * Accepts either the object format { __rl: true, mode, value } OR an expression string
 */
function generateResourceLocatorZodSchema(prop: NodeProperty): string {
	if (prop.modes && prop.modes.length > 0) {
		const modeSchema =
			prop.modes.length === 1
				? `z.literal('${prop.modes[0].name}')`
				: `z.union([${prop.modes.map((m) => `z.literal('${m.name}')`).join(', ')}])`;
		const objectSchema = `z.object({ __rl: z.literal(true), mode: ${modeSchema}, value: z.union([z.string(), z.number()]), cachedResultName: z.string().optional(), cachedResultUrl: z.string().optional() })`;
		// Allow either the object format or an expression string
		return `z.union([${objectSchema}, expressionSchema])`;
	}
	// Default case: use the general resourceLocatorValueSchema which already accepts expressions
	return 'resourceLocatorValueSchema';
}

/**
 * Map a nested property to its Zod schema code (for collection/fixedCollection inner properties)
 */
function mapNestedPropertyToZodSchema(prop: NodeProperty): string {
	const result = mapNestedPropertyToZodSchemaInner(prop);
	if (prop.noDataExpression) {
		return stripExpressionFromZodSchema(result);
	}
	return result;
}

function mapNestedPropertyToZodSchemaInner(prop: NodeProperty): string {
	// Skip display-only types
	if (['notice', 'curlImport', 'credentials'].includes(prop.type)) {
		return '';
	}

	// Handle resourceLocator first - it has its own structure regardless of dynamic options
	if (prop.type === 'resourceLocator') {
		return generateResourceLocatorZodSchema(prop);
	}

	// Handle resourceMapper - it has its own structure with mappingMode and value
	if (prop.type === 'resourceMapper') {
		return 'resourceMapperValueSchema';
	}

	// Handle dynamic options (but not for types with specific structure)
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
	const result = mapPropertyToZodSchemaInner(prop);
	if (prop.noDataExpression) {
		return stripExpressionFromZodSchema(result);
	}
	return result;
}

/**
 * Strip expression support from a Zod schema code string.
 * Used when noDataExpression is true.
 */
function stripExpressionFromZodSchema(schema: string): string {
	// Replace OrExpression helpers with plain types
	if (schema === 'stringOrExpression') return 'z.string()';
	if (schema === 'numberOrExpression') return 'z.number()';
	if (schema === 'booleanOrExpression') return 'z.boolean()';
	// Remove expressionSchema from z.union([..., expressionSchema])
	return schema.replace(/,\s*expressionSchema/g, '');
}

function mapPropertyToZodSchemaInner(prop: NodeProperty): string {
	// Special handling for known credentialsSelect fields with fixed values
	if (prop.type === 'credentialsSelect' && prop.name === 'genericAuthType') {
		const literals = GENERIC_AUTH_TYPE_VALUES.map((v) => `z.literal('${v}')`);
		return `z.union([${literals.join(', ')}, expressionSchema])`;
	}

	// Handle resourceLocator first - it has its own structure regardless of dynamic options
	if (prop.type === 'resourceLocator') {
		return generateResourceLocatorZodSchema(prop);
	}

	// Handle resourceMapper - it has its own structure with mappingMode and value
	if (prop.type === 'resourceMapper') {
		return 'resourceMapperValueSchema';
	}

	// Handle dynamic options (loadOptionsMethod) - but not for types with specific structure
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
	return `${INDENT}${propName}: ${schema},`;
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
 * Display options type for merging (matches DisplayOptions defined later in this file)
 */
type MergeableDisplayOptions = {
	show?: Record<string, unknown[]>;
	hide?: Record<string, unknown[]>;
};

/**
 * Merge two displayOptions objects by combining their show/hide conditions.
 * Used when multiple properties share the same name but have different visibility conditions.
 *
 * @param existing - The existing displayOptions to merge into
 * @param incoming - The incoming displayOptions to merge from
 * @returns Merged displayOptions with combined show/hide conditions
 */
export function mergeDisplayOptions(
	existing: MergeableDisplayOptions,
	incoming: MergeableDisplayOptions,
): MergeableDisplayOptions {
	const merged: MergeableDisplayOptions = { ...existing };

	// Merge 'show' conditions
	if (incoming.show) {
		merged.show = merged.show ?? {};
		for (const [key, values] of Object.entries(incoming.show)) {
			const existingValues = merged.show[key] ?? [];
			// Combine arrays, avoiding duplicates using JSON comparison for objects
			const combined = [...existingValues];
			for (const val of values) {
				const isDuplicate = combined.some(
					(existingVal) => JSON.stringify(existingVal) === JSON.stringify(val),
				);
				if (!isDuplicate) {
					combined.push(val);
				}
			}
			merged.show[key] = combined;
		}
	}

	// Merge 'hide' conditions (same logic)
	if (incoming.hide) {
		merged.hide = merged.hide ?? {};
		for (const [key, values] of Object.entries(incoming.hide)) {
			const existingValues = merged.hide[key] ?? [];
			const combined = [...existingValues];
			for (const val of values) {
				const isDuplicate = combined.some(
					(existingVal) => JSON.stringify(existingVal) === JSON.stringify(val),
				);
				if (!isDuplicate) {
					combined.push(val);
				}
			}
			merged.hide[key] = combined;
		}
	}

	return merged;
}

/**
 * Merge duplicate properties by name, combining displayOptions and nested options.
 * When multiple properties have the same name (e.g., multiple 'options' collections
 * with different displayOptions), their displayOptions and nested options are merged.
 *
 * @param properties - Array of node properties, possibly with duplicates
 * @returns Map of property name to merged property
 */
export function mergePropertiesByName(properties: NodeProperty[]): Map<string, NodeProperty> {
	const propsByName = new Map<string, NodeProperty>();

	for (const prop of properties) {
		// Skip display-only types
		if (['notice', 'curlImport', 'credentials'].includes(prop.type)) {
			continue;
		}

		const existing = propsByName.get(prop.name);
		if (existing) {
			// Merge displayOptions from duplicate property
			if (prop.displayOptions && existing.displayOptions) {
				existing.displayOptions = mergeDisplayOptions(existing.displayOptions, prop.displayOptions);
			} else if (prop.displayOptions && !existing.displayOptions) {
				// If only the new one has displayOptions, the existing one has no condition
				// which means it's always visible - keep existing as-is (no condition)
			}

			// For collection/fixedCollection types, merge nested options
			if (
				(prop.type === 'collection' || prop.type === 'fixedCollection') &&
				prop.options &&
				existing.options
			) {
				const existingOptionNames = new Set(existing.options.map((o) => o.name));
				for (const opt of prop.options) {
					if (!existingOptionNames.has(opt.name)) {
						existing.options.push(opt);
					}
				}
			}
			// Keep the first property's other attributes (type, required, etc.)
		} else {
			// Create a shallow copy to avoid mutating the original when merging
			propsByName.set(prop.name, {
				...prop,
				options: prop.options ? [...prop.options] : undefined,
			});
		}
	}

	return propsByName;
}

/**
 * Generate a conditional schema property line using resolveSchema helper.
 * Used for properties that have displayOptions (conditionally shown/hidden fields).
 *
 * @param prop - The property with displayOptions
 * @param allProperties - All properties at this level (used to extract defaults for displayOptions)
 * @returns Generated code line for the property using resolveSchema
 */
export function generateConditionalSchemaLine(
	prop: NodeProperty,
	allProperties: NodeProperty[] = [],
): string {
	const zodSchema = mapPropertyToZodSchema(prop);
	if (!zodSchema) {
		return '';
	}

	const propName = quotePropertyName(prop.name);
	const required = !isPropertyOptional(prop);
	const displayOptionsStr = JSON.stringify(prop.displayOptions);

	// Extract defaults for properties referenced in displayOptions
	const defaults = prop.displayOptions
		? extractDefaultsForDisplayOptions(prop.displayOptions, allProperties)
		: {};
	const defaultsStr =
		Object.keys(defaults).length > 0 ? `, defaults: ${JSON.stringify(defaults)}` : '';

	return `${INDENT}${propName}: resolveSchema({ parameters, schema: ${zodSchema}, required: ${required}, displayOptions: ${displayOptionsStr}${defaultsStr} }),`;
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
 * When any AI input has displayOptions (conditional requirement), generates a factory function
 * that uses resolveSchema for dynamic field resolution. Otherwise generates a static schema.
 *
 * @param aiInputTypes Array of AI input types with required status
 * @param schemaName The base schema name to use for the subnode config schema
 * @returns Zod schema code string or null if no AI inputs
 *
 * NOTE: Generates CommonJS JavaScript, not TypeScript.
 */
export function generateSubnodeConfigSchemaCode(
	aiInputTypes: AIInputTypeInfo[],
	schemaName: string,
	allProperties?: NodeProperty[],
): string | null {
	if (aiInputTypes.length === 0) {
		return null;
	}

	const hasConditional = hasConditionalSubnodeFields(aiInputTypes);
	const lines: string[] = [];

	if (hasConditional) {
		// Generate factory function for conditional fields (CommonJS)
		lines.push(`function get${schemaName}SubnodeConfigSchema({ parameters, resolveSchema }) {`);
		lines.push(`${INDENT}return z.object({`);
	} else {
		// Generate static schema (CommonJS)
		lines.push(`const ${schemaName}SubnodeConfigSchema = z.object({`);
	}

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

		if (aiInput.displayOptions) {
			// Use resolveSchema for conditional fields
			const displayOptionsStr = JSON.stringify(aiInput.displayOptions);
			const indent = hasConditional ? INDENT.repeat(2) : INDENT;
			// Extract defaults for properties referenced in displayOptions
			let defaultsStr = '';
			if (allProperties) {
				const defaults = extractDefaultsForDisplayOptions(aiInput.displayOptions, allProperties);
				if (Object.keys(defaults).length > 0) {
					defaultsStr = `, defaults: ${JSON.stringify(defaults)}`;
				}
			}
			lines.push(
				`${indent}${fieldInfo.fieldName}: resolveSchema({ parameters, schema: ${schemaStr}, required: ${aiInput.required}, displayOptions: ${displayOptionsStr}${defaultsStr} }),`,
			);
		} else if (!aiInput.required) {
			const indent = hasConditional ? INDENT.repeat(2) : INDENT;
			lines.push(`${indent}${fieldInfo.fieldName}: ${schemaStr}.optional(),`);
		} else {
			const indent = hasConditional ? INDENT.repeat(2) : INDENT;
			lines.push(`${indent}${fieldInfo.fieldName}: ${schemaStr},`);
		}
	}

	if (hasConditional) {
		lines.push(`${INDENT}});`);
		lines.push('}');
		lines.push(
			`exports.get${schemaName}SubnodeConfigSchema = get${schemaName}SubnodeConfigSchema;`,
		);
	} else {
		lines.push('});');
		lines.push(`exports.${schemaName}SubnodeConfigSchema = ${schemaName}SubnodeConfigSchema;`);
	}

	return lines.join('\n');
}

/**
 * Get the schema imports needed for a set of AI input types.
 * Returns array of schema names to import from base.schema.js
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
 * All schema helpers (z, expressionSchema, etc.) are received as parameters
 * from the schema-validator, not imported from external files.
 *
 * @param node The node type description
 * @param specificVersion The specific version number to generate for
 */
export function generateSingleVersionSchemaFile(
	node: NodeTypeDescription,
	specificVersion: number,
): string {
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
	const hasAiInputs = aiInputTypes.length > 0;

	// Check if we need resolveSchema (properties with displayOptions or conditional AI inputs)
	const needsResolveSchema =
		hasDisplayOptions(filteredProperties) ||
		(hasAiInputs && hasConditionalSubnodeFields(aiInputTypes));

	const lines: string[] = [];

	// Build the list of helpers that will be destructured from factory parameters
	const helpers = [
		'z',
		'expressionSchema',
		'stringOrExpression',
		'numberOrExpression',
		'booleanOrExpression',
		'resourceLocatorValueSchema',
		'resourceMapperValueSchema',
		'filterValueSchema',
		'assignmentCollectionValueSchema',
		'iDataObjectSchema',
	];

	// Add resolveSchema if we need it
	if (needsResolveSchema) {
		helpers.push('resolveSchema');
	}

	// Add subnode schema imports if this is an AI node
	for (const schemaImport of subnodeSchemaImports) {
		helpers.push(schemaImport);
	}

	// Header
	lines.push('/**');
	lines.push(` * ${node.displayName} Node - Version ${specificVersion} - Zod Validation Schemas`);
	lines.push(' *');
	lines.push(' * These schemas validate node configuration at runtime.');
	lines.push(' * Use .parse() for strict validation or .safeParse() for error handling.');
	lines.push(' *');
	lines.push(' * Schema helpers (z, expressionSchema, etc.) are passed as parameters');
	lines.push(' * by the schema-validator, not imported from external files.');
	lines.push(' *');
	lines.push(' * @generated - CommonJS JavaScript for runtime loading');
	lines.push(' */');
	lines.push('');

	// Export factory function that receives all helpers as parameters
	lines.push(`module.exports = function getSchema({ parameters, ${helpers.join(', ')} }) {`);

	// Generate subnode helper function if AI node with conditional fields
	if (hasAiInputs && hasConditionalSubnodeFields(aiInputTypes)) {
		lines.push('');
		lines.push(`${INDENT}// Helper function for conditional subnode schema`);
		lines.push(`${INDENT}function getSubnodesSchema() {`);
		lines.push(`${INDENT.repeat(2)}return z.object({`);
		for (const aiInput of aiInputTypes) {
			const fieldInfo = AI_TYPE_TO_SCHEMA_FIELD[aiInput.type];
			if (!fieldInfo) continue;

			let schemaStr: string;
			if (fieldInfo.isArray) {
				schemaStr = `z.array(${fieldInfo.schemaName})`;
			} else if (fieldInfo.canBeMultiple) {
				schemaStr = `z.union([${fieldInfo.schemaName}, z.array(${fieldInfo.schemaName})])`;
			} else {
				schemaStr = fieldInfo.schemaName;
			}

			if (aiInput.displayOptions) {
				const displayOptionsStr = JSON.stringify(aiInput.displayOptions);
				const defaults = extractDefaultsForDisplayOptions(
					aiInput.displayOptions,
					filteredProperties,
				);
				const defaultsStr =
					Object.keys(defaults).length > 0 ? `, defaults: ${JSON.stringify(defaults)}` : '';
				lines.push(
					`${INDENT.repeat(3)}${fieldInfo.fieldName}: resolveSchema({ parameters, schema: ${schemaStr}, required: ${aiInput.required}, displayOptions: ${displayOptionsStr}${defaultsStr} }),`,
				);
			} else if (!aiInput.required) {
				lines.push(`${INDENT.repeat(3)}${fieldInfo.fieldName}: ${schemaStr}.optional(),`);
			} else {
				lines.push(`${INDENT.repeat(3)}${fieldInfo.fieldName}: ${schemaStr},`);
			}
		}
		lines.push(`${INDENT.repeat(2)}}).strict();`);
		lines.push(`${INDENT}}`);
	}

	// Generate static subnode schema if AI node without conditional fields
	if (hasAiInputs && !hasConditionalSubnodeFields(aiInputTypes)) {
		lines.push('');
		lines.push(`${INDENT}// Static subnode schema`);
		lines.push(`${INDENT}const subnodesSchema = z.object({`);
		for (const aiInput of aiInputTypes) {
			const fieldInfo = AI_TYPE_TO_SCHEMA_FIELD[aiInput.type];
			if (!fieldInfo) continue;

			let schemaStr: string;
			if (fieldInfo.isArray) {
				schemaStr = `z.array(${fieldInfo.schemaName})`;
			} else if (fieldInfo.canBeMultiple) {
				schemaStr = `z.union([${fieldInfo.schemaName}, z.array(${fieldInfo.schemaName})])`;
			} else {
				schemaStr = fieldInfo.schemaName;
			}

			if (!aiInput.required) {
				lines.push(`${INDENT.repeat(2)}${fieldInfo.fieldName}: ${schemaStr}.optional(),`);
			} else {
				lines.push(`${INDENT.repeat(2)}${fieldInfo.fieldName}: ${schemaStr},`);
			}
		}
		lines.push(`${INDENT}}).strict();`);
	}

	// Generate parameters schema
	lines.push('');
	lines.push(`${INDENT}// Parameters schema`);
	lines.push(`${INDENT}const parametersSchema = z.object({`);

	// Group properties by name, merging displayOptions and nested options for duplicates
	const propsByName = mergePropertiesByName(filteredProperties);
	const allPropsArray = Array.from(propsByName.values());

	for (const prop of allPropsArray) {
		if (prop.displayOptions) {
			// Strip @version since it's implicit in the file path
			const strippedDisplayOptions = stripDiscriminatorKeysFromDisplayOptions(prop.displayOptions, [
				'@version',
			]);
			if (strippedDisplayOptions) {
				const propWithStripped: NodeProperty = {
					...prop,
					displayOptions: strippedDisplayOptions,
				};
				const propLine = generateConditionalSchemaLine(propWithStripped, allPropsArray);
				if (propLine) {
					lines.push(INDENT + propLine);
				}
			} else {
				// No remaining conditions after stripping @version - use static schema
				const propLine = generateSchemaPropertyLine(prop, isPropertyOptional(prop));
				if (propLine) {
					lines.push(INDENT + propLine);
				}
			}
		} else {
			const propLine = generateSchemaPropertyLine(prop, isPropertyOptional(prop));
			if (propLine) {
				lines.push(INDENT + propLine);
			}
		}
	}

	lines.push(`${INDENT}});`);

	// Return the combined schema
	lines.push('');
	lines.push(`${INDENT}// Return combined config schema`);
	lines.push(`${INDENT}return z.object({`);
	lines.push(`${INDENT.repeat(2)}parameters: parametersSchema.optional(),`);
	if (hasAiInputs) {
		const subnodesOptional = !hasRequiredSubnodeFields(aiInputTypes);
		if (hasConditionalSubnodeFields(aiInputTypes)) {
			lines.push(
				`${INDENT.repeat(2)}subnodes: getSubnodesSchema()${subnodesOptional ? '.optional()' : ''},`,
			);
		} else {
			lines.push(
				`${INDENT.repeat(2)}subnodes: subnodesSchema${subnodesOptional ? '.optional()' : ''},`,
			);
		}
	}
	lines.push(`${INDENT}});`);
	lines.push('};');

	return lines.join('\n');
}

// generateBaseSchemaFile has been removed - helpers are now passed as parameters
// to schema factory functions from schema-validator.ts via schema-helpers.ts
// See schema-helpers.ts for the TypeScript implementations of these helpers.

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
 * @param importDepth How many levels deep (for import paths to base.schema.js)
 * @param aiInputTypes AI input types for this specific combo (filtered by discriminator)
 *
 * NOTE: Generates CommonJS JavaScript, not TypeScript.
 */
export function generateDiscriminatorSchemaFile(
	node: NodeTypeDescription,
	version: number,
	combo: DiscriminatorCombination,
	props: NodeProperty[],
	_importDepth: number,
	aiInputTypes: AIInputTypeInfo[] = [],
): string {
	const hasAiInputs = aiInputTypes.length > 0;

	// Get discriminator keys to strip from displayOptions
	// Always include @version since it's implicit in the file path
	const discriminatorKeys = [
		...Object.keys(combo).filter((k) => combo[k] !== undefined),
		'@version',
	];

	// Check if any properties have remaining displayOptions after stripping discriminators
	const hasRemainingDisplayOptions = props.some((prop) => {
		if (!prop.displayOptions) return false;
		const stripped = stripDiscriminatorKeysFromDisplayOptions(
			prop.displayOptions,
			discriminatorKeys,
		);
		return stripped !== undefined;
	});

	// Check if AI inputs have conditional fields (displayOptions)
	const hasConditionalAiInputs = hasAiInputs && hasConditionalSubnodeFields(aiInputTypes);

	const lines: string[] = [];

	// Build description from discriminator values
	const comboDesc = Object.entries(combo)
		.filter(([_, v]) => v !== undefined)
		.map(([k, v]) => `${k}=${v}`)
		.join(', ');

	// Build list of helpers that will be destructured from factory parameters
	const helpers = [
		'z',
		'expressionSchema',
		'stringOrExpression',
		'numberOrExpression',
		'booleanOrExpression',
		'resourceLocatorValueSchema',
		'resourceMapperValueSchema',
		'filterValueSchema',
		'assignmentCollectionValueSchema',
		'iDataObjectSchema',
	];

	// Add resolveSchema if properties have displayOptions OR AI inputs have displayOptions
	if (hasRemainingDisplayOptions || hasConditionalAiInputs) {
		helpers.push('resolveSchema');
	}

	// Add subnode schema imports if this combo has AI inputs
	if (hasAiInputs) {
		const subnodeImports = getSubnodeSchemaImports(aiInputTypes);
		for (const schemaImport of subnodeImports) {
			helpers.push(schemaImport);
		}
	}

	// Header
	lines.push('/**');
	lines.push(` * ${node.displayName} Node - Version ${version} - Zod Schema`);
	lines.push(` * Discriminator: ${comboDesc}`);
	lines.push(' *');
	lines.push(' * Use .parse() for strict validation or .safeParse() for error handling.');
	lines.push(' *');
	lines.push(' * Schema helpers (z, expressionSchema, etc.) are passed as parameters');
	lines.push(' * by the schema-validator, not imported from external files.');
	lines.push(' *');
	lines.push(' * @generated - CommonJS JavaScript for runtime loading');
	lines.push(' */');
	lines.push('');

	// Export factory function that receives all helpers as parameters
	lines.push(`module.exports = function getSchema({ parameters, ${helpers.join(', ')} }) {`);

	// Generate subnode helper function if AI node with conditional fields
	if (hasConditionalAiInputs) {
		lines.push('');
		lines.push(`${INDENT}// Helper function for conditional subnode schema`);
		lines.push(`${INDENT}function getSubnodesSchema() {`);
		lines.push(`${INDENT.repeat(2)}return z.object({`);
		for (const aiInput of aiInputTypes) {
			const fieldInfo = AI_TYPE_TO_SCHEMA_FIELD[aiInput.type];
			if (!fieldInfo) continue;

			let schemaStr: string;
			if (fieldInfo.isArray) {
				schemaStr = `z.array(${fieldInfo.schemaName})`;
			} else if (fieldInfo.canBeMultiple) {
				schemaStr = `z.union([${fieldInfo.schemaName}, z.array(${fieldInfo.schemaName})])`;
			} else {
				schemaStr = fieldInfo.schemaName;
			}

			if (aiInput.displayOptions) {
				const displayOptionsStr = JSON.stringify(aiInput.displayOptions);
				const defaults = extractDefaultsForDisplayOptions(aiInput.displayOptions, props);
				const defaultsStr =
					Object.keys(defaults).length > 0 ? `, defaults: ${JSON.stringify(defaults)}` : '';
				lines.push(
					`${INDENT.repeat(3)}${fieldInfo.fieldName}: resolveSchema({ parameters, schema: ${schemaStr}, required: ${aiInput.required}, displayOptions: ${displayOptionsStr}${defaultsStr} }),`,
				);
			} else if (!aiInput.required) {
				lines.push(`${INDENT.repeat(3)}${fieldInfo.fieldName}: ${schemaStr}.optional(),`);
			} else {
				lines.push(`${INDENT.repeat(3)}${fieldInfo.fieldName}: ${schemaStr},`);
			}
		}
		lines.push(`${INDENT.repeat(2)}}).strict();`);
		lines.push(`${INDENT}}`);
	}

	// Generate static subnode schema if AI node without conditional fields
	if (hasAiInputs && !hasConditionalAiInputs) {
		lines.push('');
		lines.push(`${INDENT}// Static subnode schema`);
		lines.push(`${INDENT}const subnodesSchema = z.object({`);
		for (const aiInput of aiInputTypes) {
			const fieldInfo = AI_TYPE_TO_SCHEMA_FIELD[aiInput.type];
			if (!fieldInfo) continue;

			let schemaStr: string;
			if (fieldInfo.isArray) {
				schemaStr = `z.array(${fieldInfo.schemaName})`;
			} else if (fieldInfo.canBeMultiple) {
				schemaStr = `z.union([${fieldInfo.schemaName}, z.array(${fieldInfo.schemaName})])`;
			} else {
				schemaStr = fieldInfo.schemaName;
			}

			if (!aiInput.required) {
				lines.push(`${INDENT.repeat(2)}${fieldInfo.fieldName}: ${schemaStr}.optional(),`);
			} else {
				lines.push(`${INDENT.repeat(2)}${fieldInfo.fieldName}: ${schemaStr},`);
			}
		}
		lines.push(`${INDENT}}).strict();`);
	}

	// Return the schema
	lines.push('');
	lines.push(`${INDENT}return z.object({`);
	lines.push(`${INDENT.repeat(2)}parameters: z.object({`);

	// Add discriminator fields as literals (with defaults if they have matching defaults)
	for (const [key, value] of Object.entries(combo)) {
		if (value !== undefined) {
			// Check if this discriminator has a matching default value in node properties
			const discProp = node.properties?.find((p) => p.name === key);
			const hasMatchingDefault = discProp?.default === value;

			if (hasMatchingDefault) {
				// Accept undefined and default to the expected value
				lines.push(`${INDENT.repeat(3)}${key}: z.literal('${value}').default('${value}'),`);
			} else {
				// Require the literal value (no matching default)
				lines.push(`${INDENT.repeat(3)}${key}: z.literal('${value}'),`);
			}
		}
	}

	// Group properties by name, merging displayOptions and nested options for duplicates
	const propsByName = mergePropertiesByName(props);

	// Generate schema for each merged property
	// Convert propsByName to array for extractDefaultsForDisplayOptions
	const allPropsArray = Array.from(propsByName.values());
	for (const prop of allPropsArray) {
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
				const propLine = generateConditionalSchemaLine(propWithStrippedOptions, allPropsArray);
				if (propLine) {
					lines.push(INDENT.repeat(2) + propLine);
				}
			} else {
				const propLine = generateSchemaPropertyLine(prop, isPropertyOptional(prop));
				if (propLine) {
					lines.push(INDENT.repeat(2) + propLine);
				}
			}
		} else {
			const propLine = generateSchemaPropertyLine(prop, isPropertyOptional(prop));
			if (propLine) {
				lines.push(INDENT.repeat(2) + propLine);
			}
		}
	}

	lines.push(`${INDENT.repeat(2)}}).optional(),`);

	if (hasAiInputs) {
		const subnodesOptional = !hasRequiredSubnodeFields(aiInputTypes);
		if (hasConditionalAiInputs) {
			lines.push(
				`${INDENT.repeat(2)}subnodes: getSubnodesSchema()${subnodesOptional ? '.optional()' : ''},`,
			);
		} else {
			lines.push(
				`${INDENT.repeat(2)}subnodes: subnodesSchema${subnodesOptional ? '.optional()' : ''},`,
			);
		}
	}

	lines.push(`${INDENT}});`);
	lines.push('};');

	return lines.join('\n');
}

/**
 * Generate a Zod schema index file for a resource directory (e.g., resource_ticket/index.schema.js)
 * Exports a factory function that calls all operation schema factories and unions them.
 *
 * @param node The node type description
 * @param version The specific version number
 * @param resource The resource name
 * @param operations Array of operation names for this resource
 *
 * NOTE: Generates CommonJS JavaScript, not TypeScript.
 */
export function generateResourceIndexSchemaFile(
	node: NodeTypeDescription,
	_version: number,
	resource: string,
	operations: string[],
): string {
	const lines: string[] = [];

	lines.push('/**');
	lines.push(` * ${node.displayName} - ${toPascalCase(resource)} Resource - Zod Schema Factory`);
	lines.push(' * Exports a factory that unions all operation schemas for this resource.');
	lines.push(' *');
	lines.push(' * Schema helpers (z, expressionSchema, etc.) are passed as parameters');
	lines.push(' * by the schema-validator, not imported from external files.');
	lines.push(' *');
	lines.push(' * @generated - CommonJS JavaScript for runtime loading');
	lines.push(' */');
	lines.push('');

	// Require default exports from operation schema files
	for (const op of operations.sort()) {
		const fileName = `operation_${toSnakeCase(op)}.schema`;
		const importName = `get${toPascalCase(op)}Schema`;
		lines.push(`const ${importName} = require('./${fileName}');`);
	}
	lines.push('');

	// Find default for 'operation' discriminator
	const operationProp = node.properties.find((p) => p.name === 'operation');
	const operationDefault = operationProp?.default;

	// Export factory function via module.exports - receives all helpers and passes them through
	lines.push('module.exports = function getSchema(helpers) {');
	lines.push(`${INDENT}const { parameters, z } = helpers;`);

	// Apply operation default if operation is missing from parameters
	if (operationDefault !== undefined) {
		const defaultValueStr =
			typeof operationDefault === 'string'
				? `'${operationDefault}'`
				: JSON.stringify(operationDefault);
		lines.push(`${INDENT}// Apply operation default if not set`);
		lines.push(
			`${INDENT}const effectiveParams = parameters.operation === undefined ? { ...parameters, operation: ${defaultValueStr} } : parameters;`,
		);
	}

	const paramsVar = operationDefault !== undefined ? 'effectiveParams' : 'parameters';
	const helpersArg =
		operationDefault !== undefined ? `{ ...helpers, parameters: ${paramsVar} }` : 'helpers';

	if (operations.length === 1) {
		const importName = `get${toPascalCase(operations[0])}Schema`;
		lines.push(`${INDENT}return ${importName}(${helpersArg});`);
	} else {
		lines.push(`${INDENT}return z.union([`);
		for (const op of operations.sort()) {
			const importName = `get${toPascalCase(op)}Schema`;
			lines.push(`${INDENT.repeat(2)}${importName}(${helpersArg}),`);
		}
		lines.push(`${INDENT}]);`);
	}
	lines.push('};');

	return lines.join('\n');
}

/**
 * Generate a version-level index file for split structure schemas (e.g., v1/index.schema.js)
 * Exports a factory function that unions all discriminator schemas.
 * Note: Subnode schemas are now generated per-combo in each discriminator file.
 *
 * @param node The node type description
 * @param version The specific version number
 * @param tree The discriminator tree structure
 *
 * NOTE: Generates CommonJS JavaScript, not TypeScript.
 */
export function generateSplitVersionIndexSchemaFile(
	node: NodeTypeDescription,
	version: number,
	tree: DiscriminatorTree,
): string {
	const lines: string[] = [];

	lines.push('/**');
	lines.push(` * ${node.displayName} Node - Version ${version} - Zod Schema Factory`);
	lines.push(' * Exports a factory that unions all discriminator schemas.');
	lines.push(' *');
	lines.push(' * Schema helpers (z, expressionSchema, etc.) are passed as parameters');
	lines.push(' * by the schema-validator, not imported from external files.');
	lines.push(' *');
	lines.push(' * @generated - CommonJS JavaScript for runtime loading');
	lines.push(' */');
	lines.push('');

	// Require default exports from child schemas
	const importNames: string[] = [];
	let discriminatorDefault: { name: string; value: unknown } | undefined;

	if (tree.type === 'resource_operation' && tree.resources) {
		for (const [resource] of tree.resources) {
			const resourceDir = `resource_${toSnakeCase(resource)}`;
			const importName = `get${toPascalCase(resource)}Schema`;
			importNames.push(importName);
			lines.push(`const ${importName} = require('./${resourceDir}/index.schema');`);
		}
		// Find default for 'resource' discriminator
		const resourceProp = node.properties.find((p) => p.name === 'resource');
		if (resourceProp?.default !== undefined) {
			discriminatorDefault = { name: 'resource', value: resourceProp.default };
		}
	} else if (tree.type === 'single' && tree.discriminatorName && tree.discriminatorValues) {
		const discName = tree.discriminatorName;
		for (const value of tree.discriminatorValues.sort()) {
			const fileName = `${discName}_${toSnakeCase(value)}.schema`;
			const importName = `get${toPascalCase(value)}Schema`;
			importNames.push(importName);
			lines.push(`const ${importName} = require('./${fileName}');`);
		}
		// Find default for this discriminator
		const discProp = node.properties.find((p) => p.name === discName);
		if (discProp?.default !== undefined) {
			discriminatorDefault = { name: discName, value: discProp.default };
		}
	}
	lines.push('');

	// Export factory function via module.exports - receives all helpers and passes them through
	lines.push('module.exports = function getSchema(helpers) {');
	lines.push(`${INDENT}const { parameters, z } = helpers;`);

	// Apply discriminator default if discriminator is missing from parameters
	if (discriminatorDefault) {
		const defaultValueStr =
			typeof discriminatorDefault.value === 'string'
				? `'${discriminatorDefault.value}'`
				: JSON.stringify(discriminatorDefault.value);
		lines.push(`${INDENT}// Apply discriminator default if not set`);
		lines.push(
			`${INDENT}const effectiveParams = parameters.${discriminatorDefault.name} === undefined ? { ...parameters, ${discriminatorDefault.name}: ${defaultValueStr} } : parameters;`,
		);
	}

	const paramsVar = discriminatorDefault ? 'effectiveParams' : 'parameters';
	const helpersArg = discriminatorDefault ? `{ ...helpers, parameters: ${paramsVar} }` : 'helpers';

	if (importNames.length === 1) {
		lines.push(`${INDENT}return ${importNames[0]}(${helpersArg});`);
	} else if (importNames.length > 1) {
		lines.push(`${INDENT}return z.union([`);
		for (const importName of importNames) {
			lines.push(`${INDENT.repeat(2)}${importName}(${helpersArg}),`);
		}
		lines.push(`${INDENT}]);`);
	} else {
		lines.push(`${INDENT}return z.object({});`);
	}
	lines.push('};');

	return lines.join('\n');
}

/**
 * Plan schema files for a split version directory.
 * Returns a Map of relative file paths to their content, to be merged with type files.
 * All discriminated schema files export factory functions for consistency.
 *
 * @param node The node type description
 * @param version The specific version number
 * @returns Map of relative path -> file content (schema files only, .js extension)
 *
 * NOTE: Generates CommonJS JavaScript files (.schema.js), not TypeScript.
 */
export function planSplitVersionSchemaFiles(
	node: NodeTypeDescription,
	version: number,
): Map<string, string> {
	const files = new Map<string, string>();

	// Get discriminator combinations
	const combinations = extractDiscriminatorCombinations(node);
	const tree = buildDiscriminatorTree(combinations);

	// Prepare version-filtered node for AI input extraction
	const versionFilteredNode: NodeTypeDescription = {
		...node,
		properties: filterPropertiesForVersion(node.properties, version),
		version,
	};

	if (tree.type === 'resource_operation' && tree.resources) {
		// Resource/operation pattern: nested directories
		for (const [resource, operations] of tree.resources) {
			const resourceDir = `resource_${toSnakeCase(resource)}`;

			// Generate operation schema files within resource directory
			for (const operation of operations) {
				// Skip Custom API Call operations - they don't have fixed schemas
				if (isCustomApiCall(operation)) continue;

				const combo = { resource, operation };
				const versionFilteredProps = filterPropertiesForVersion(node.properties, version);
				const nodeForCombination = { ...node, properties: versionFilteredProps };
				const props = getPropertiesForCombination(nodeForCombination, combo);
				const fileName = `operation_${toSnakeCase(operation)}.schema.js`;
				const filePath = `${resourceDir}/${fileName}`;

				// Extract AI inputs specific to this combo
				const comboAiInputTypes = extractAIInputTypesFromBuilderHint(versionFilteredNode, combo);

				// Import depth: 5 levels deep (nodes/pkg/nodeName/version/resource_x/operation.schema.js -> base.schema)
				const content = generateDiscriminatorSchemaFile(
					node,
					version,
					combo,
					props,
					5,
					comboAiInputTypes,
				);
				files.set(filePath, content);
			}

			// Generate resource schema index file (filter out Custom API Call operations)
			const filteredOperations = operations.filter((op) => !isCustomApiCall(op));
			const resourceIndexContent = generateResourceIndexSchemaFile(
				node,
				version,
				resource,
				filteredOperations,
			);
			files.set(`${resourceDir}/index.schema.js`, resourceIndexContent);
		}
	} else if (tree.type === 'single' && tree.discriminatorName && tree.discriminatorValues) {
		// Single discriminator pattern (mode, etc.): flat files
		const discName = tree.discriminatorName;

		for (const value of tree.discriminatorValues) {
			const combo: DiscriminatorCombination = { [discName]: value };
			const versionFilteredProps = filterPropertiesForVersion(node.properties, version);
			const nodeForCombination = { ...node, properties: versionFilteredProps };
			const props = getPropertiesForCombination(nodeForCombination, combo);
			const fileName = `${discName}_${toSnakeCase(value)}.schema.js`;

			// Extract AI inputs specific to this combo
			const comboAiInputTypes = extractAIInputTypesFromBuilderHint(versionFilteredNode, combo);

			// Import depth: 4 levels deep (nodes/pkg/nodeName/version/mode.schema.js -> base.schema)
			const content = generateDiscriminatorSchemaFile(
				node,
				version,
				combo,
				props,
				4,
				comboAiInputTypes,
			);
			files.set(fileName, content);
		}
	}

	// Generate version schema index file (no longer includes shared subnode schema - each combo has its own)
	files.set('index.schema.js', generateSplitVersionIndexSchemaFile(node, version, tree));

	return files;
}
