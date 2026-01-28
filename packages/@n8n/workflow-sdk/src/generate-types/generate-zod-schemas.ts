/**
 * Zod Schema Generation
 *
 * Generates Zod validation schemas alongside TypeScript types for node configurations.
 * These schemas enable runtime validation of node configs via .parse() or .safeParse().
 *
 * This module parallels generate-types.ts but outputs Zod schemas instead of TypeScript types.
 */

import type { NodeProperty, NodeTypeDescription } from './generate-types';

import {
	extractDiscriminatorCombinations,
	getPropertiesForCombination,
	filterPropertiesForVersion,
	versionToTypeName,
	getPackageName,
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

// =============================================================================
// Helper Functions
// =============================================================================

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
	lines.push("} from '../../../base.schema';");
	lines.push('');

	// Generate schemas section
	lines.push('// ' + '='.repeat(75));
	lines.push('// Validation Schemas');
	lines.push('// ' + '='.repeat(75));
	lines.push('');

	// Generate schemas using the same logic as type generation
	const schemaResult = generateSchemasForNode(filteredNode, nodeName, versionSuffix);
	lines.push(schemaResult.code);

	return lines.join('\n');
}

/**
 * Generate Zod schemas for a node (handles both flat and discriminated patterns)
 */
function generateSchemasForNode(
	node: NodeTypeDescription,
	nodeName: string,
	versionSuffix: string,
): SchemaGenerationResult {
	const combinations = extractDiscriminatorCombinations(node);
	const lines: string[] = [];
	const schemaInfos: SchemaInfo[] = [];

	if (combinations.length === 0) {
		// No discriminators - generate simple schema
		const schemaName = `${nodeName}${versionSuffix}ConfigSchema`;
		const typeName = `${nodeName}${versionSuffix}Config`;

		lines.push(`export const ${schemaName} = z.object({`);

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
		lines.push(`export type ${typeName}Validated = z.infer<typeof ${schemaName}>;`);

		schemaInfos.push({
			schemaName,
			typeName,
			discriminators: {},
		});

		return { code: lines.join('\n'), schemaInfos };
	}

	// Generate individual schemas for each combination
	const schemaNames: string[] = [];

	for (const combo of combinations) {
		const comboValues = Object.entries(combo)
			.filter(([_, v]) => v !== undefined)
			.map(([_, v]) => toPascalCase(v!));
		const schemaName = `${nodeName}${versionSuffix}${comboValues.join('')}ConfigSchema`;
		const typeName = `${nodeName}${versionSuffix}${comboValues.join('')}Config`;
		schemaNames.push(schemaName);

		// Track schema info
		const schemaInfo: SchemaInfo = {
			schemaName,
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

		lines.push(`export const ${schemaName} = z.object({`);

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
	}

	// Generate union schema
	const unionSchemaName = `${nodeName}${versionSuffix}ConfigSchema`;
	if (schemaNames.length === 1) {
		lines.push(`export const ${unionSchemaName} = ${schemaNames[0]};`);
	} else {
		lines.push(`export const ${unionSchemaName} = z.union([`);
		for (const name of schemaNames) {
			lines.push(`\t${name},`);
		}
		lines.push(']);');
	}
	lines.push('');
	lines.push(
		`export type ${nodeName}${versionSuffix}ConfigValidated = z.infer<typeof ${unionSchemaName}>;`,
	);

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
