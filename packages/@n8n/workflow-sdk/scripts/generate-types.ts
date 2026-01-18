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
import * as path from 'path';

// =============================================================================
// Configuration
// =============================================================================

const NODES_BASE_TYPES = path.resolve(__dirname, '../../../nodes-base/dist/types/nodes.json');
const NODES_LANGCHAIN_TYPES = path.resolve(
	__dirname,
	'../../nodes-langchain/dist/types/nodes.json',
);
const OUTPUT_PATH = path.resolve(__dirname, '../src/types/generated');

// Discriminator fields that create operation-specific parameter sets
const DISCRIMINATOR_FIELDS = [
	'resource',
	'operation',
	'mode',
	'authentication',
	'trigger',
	'agent',
	'promptType',
];

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

// =============================================================================
// Type Definitions
// =============================================================================

export interface NodeProperty {
	name: string;
	displayName: string;
	type: string;
	description?: string;
	default?: unknown;
	required?: boolean;
	options?: Array<{ name: string; value: string | number | boolean; description?: string }>;
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

// =============================================================================
// Property Type Mapping
// =============================================================================

/**
 * Map n8n property types to TypeScript types with Expression wrappers
 */
export function mapPropertyType(prop: NodeProperty): string {
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
			// Use Record<string, unknown> to avoid naming conflicts
			// Complex fixedCollection structures vary too much across nodes
			return 'Record<string, unknown>';

		case 'collection':
			return 'Record<string, unknown>';

		case 'dateTime':
			return 'string | Expression<string>';

		case 'color':
			return 'string | Expression<string>';

		case 'hidden':
			return 'unknown';

		case 'notice':
		case 'curlImport':
		case 'credentials':
		case 'credentialsSelect':
			return ''; // Skip these types

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

	// Check for other single-discriminator patterns (agent, promptType, mode, etc.)
	const otherDiscriminators = ['agent', 'promptType', 'mode', 'authentication'];
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
		if (['notice', 'curlImport', 'credentials', 'credentialsSelect'].includes(prop.type)) {
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
		const interfaceName = `${nodeName}${versionSuffix}Params`;
		lines.push(`export interface ${interfaceName} {`);

		// Track seen property names to avoid duplicates
		const seenNames = new Set<string>();
		for (const prop of node.properties) {
			if (['notice', 'curlImport', 'credentials', 'credentialsSelect'].includes(prop.type)) {
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
			const propLine = generatePropertyLine(prop, !prop.required);
			if (propLine) {
				lines.push(propLine);
			}
		}

		lines.push('};');
		lines.push('');
	}

	// Generate union type
	const unionName = `${nodeName}${versionSuffix}Params`;
	lines.push(`export type ${unionName} =`);
	for (let i = 0; i < configTypeNames.length; i++) {
		const prefix = i === 0 ? '\t| ' : '\t| ';
		lines.push(`${prefix}${configTypeNames[i]}`);
	}
	lines.push('\t;');

	return lines.join('\n');
}

// =============================================================================
// JSDoc Generation
// =============================================================================

/**
 * Generate JSDoc comment for a property
 */
export function generatePropertyJSDoc(prop: NodeProperty): string {
	const lines: string[] = ['/**'];

	// Description
	const description = prop.description ?? prop.displayName;
	// Escape potential JSDoc breakers
	const safeDescription = description
		.replace(/\*\//g, '*\\/')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
	lines.push(` * ${safeDescription}`);

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

	// Documentation URL
	const docUrl =
		node.documentationUrl ??
		`https://docs.n8n.io/integrations/builtin/app-nodes/${getNodeBaseName(node.name).toLowerCase()}/`;
	lines.push(` * @see ${docUrl}`);

	lines.push(' *');
	lines.push(' * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.');
	lines.push(' */');

	return lines.join('\n');
}

/**
 * Generate a single property line for an interface
 */
export function generatePropertyLine(prop: NodeProperty, optional: boolean): string {
	const tsType = mapPropertyType(prop);
	if (!tsType) {
		return ''; // Skip this property
	}

	const lines: string[] = [];

	// JSDoc
	if (prop.description) {
		lines.push(generatePropertyJSDoc(prop));
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
 * Generate complete type file for a single node (or multiple version entries of the same node)
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
	lines.push('// @ts-nocheck - Generated file may have unused imports');
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
		n.properties.filter(
			(p) => !['notice', 'curlImport', 'credentials', 'credentialsSelect'].includes(p.type),
		),
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

	const paramTypeNames: string[] = [];
	for (const n of sortedNodes) {
		const entryVersion = getHighestVersion(n.version);
		const entryVersionSuffix = versionToTypeName(entryVersion);
		paramTypeNames.push(`${nodeName}${entryVersionSuffix}Params`);
		lines.push(generateDiscriminatedUnionForEntry(n, nodeName, entryVersionSuffix));
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
 */
function generateDiscriminatedUnionForEntry(
	node: NodeTypeDescription,
	nodeName: string,
	versionSuffix: string,
): string {
	const combinations = extractDiscriminatorCombinations(node);
	const lines: string[] = [];

	if (combinations.length === 0) {
		// No discriminators - generate simple interface
		const interfaceName = `${nodeName}${versionSuffix}Params`;
		lines.push(`export interface ${interfaceName} {`);

		// Track seen property names to avoid duplicates
		const seenNames = new Set<string>();
		for (const prop of node.properties) {
			if (['notice', 'curlImport', 'credentials', 'credentialsSelect'].includes(prop.type)) {
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
	// Include version suffix to avoid duplicate type names when multiple versions exist
	const configTypeNames: string[] = [];

	for (const combo of combinations) {
		// Build config name from all discriminator values + version suffix
		const comboValues = Object.entries(combo)
			.filter(([_, v]) => v !== undefined)
			.map(([_, v]) => toPascalCase(v!));
		const configName = `${nodeName}${versionSuffix}${comboValues.join('')}Config`;
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
			const propLine = generatePropertyLine(prop, !prop.required);
			if (propLine) {
				lines.push(propLine);
			}
		}

		lines.push('};');
		lines.push('');
	}

	// Generate union type
	const unionName = `${nodeName}${versionSuffix}Params`;
	lines.push(`export type ${unionName} =`);
	for (let i = 0; i < configTypeNames.length; i++) {
		const prefix = i === 0 ? '\t| ' : '\t| ';
		lines.push(`${prefix}${configTypeNames[i]}`);
	}
	lines.push('\t;');

	return lines.join('\n');
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
	lines.push(' *');
	lines.push(' * @generated');
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

	// Generate exports by package
	for (const [pkg, pkgNodes] of byPackage) {
		lines.push(`// ${pkg}`);
		for (const node of pkgNodes.sort((a, b) => a.name.localeCompare(b.name))) {
			const fileName = nodeNameToFileName(node.name);
			lines.push(`export * from './nodes/${pkg}/${fileName}';`);
		}
		lines.push('');
	}

	// Generate KnownNodeType union
	lines.push('// Combined type union');
	lines.push('export type KnownNodeType =');
	for (let i = 0; i < nodes.length; i++) {
		const prefix = i === 0 ? '\t| ' : '\t| ';
		lines.push(`${prefix}'${nodes[i].name}'`);
	}
	lines.push('\t;');
	lines.push('');

	// Generate NodeTypeMap for type-safe node creation
	lines.push('// Node type map for type inference');
	lines.push('export interface NodeTypeMap {');
	for (const node of nodes.sort((a, b) => a.name.localeCompare(b.name))) {
		const prefix = getPackagePrefix(node.name);
		const nodeName = prefix + toPascalCase(getNodeBaseName(node.name));
		lines.push(`\t'${node.name}': ${nodeName}Node;`);
	}
	lines.push('}');

	return lines.join('\n');
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

		// Generate individual files (grouping multiple version entries together)
		let generated = 0;
		for (const [fileName, nodes] of nodesByName) {
			try {
				const content = generateNodeTypeFile(nodes);
				const filePath = path.join(nodesBaseDir, `${fileName}.ts`);
				await fs.promises.writeFile(filePath, content);
				// Add first node to allNodes for index generation
				allNodes.push(nodes[0]);
				generated++;
			} catch (error) {
				console.error(`  Error generating ${fileName}:`, error);
			}
		}
		console.log(`  Generated ${generated} type files`);
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

		// Generate individual files (grouping multiple version entries together)
		let generated = 0;
		for (const [fileName, nodes] of nodesByName) {
			try {
				const content = generateNodeTypeFile(nodes);
				const filePath = path.join(nodesLangchainDir, `${fileName}.ts`);
				await fs.promises.writeFile(filePath, content);
				// Add first node to allNodes for index generation
				allNodes.push(nodes[0]);
				generated++;
			} catch (error) {
				console.error(`  Error generating ${fileName}:`, error);
			}
		}
		console.log(`  Generated ${generated} type files`);
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
