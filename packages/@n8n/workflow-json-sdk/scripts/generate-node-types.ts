import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface NodeProperty {
	displayName?: string;
	name: string;
	type: string;
	default?: unknown;
	required?: boolean;
	options?: Array<{ name: string; value: string | number | boolean }>;
}

interface Node {
	name: string;
	displayName: string;
	version: number | number[];
	properties?: NodeProperty[];
}

function toPascalCase(str: string): string {
	// Convert n8n-nodes-base.actionNetwork to ActionNetwork
	const parts = str.split('.');
	const nodeName = parts[parts.length - 1];
	return nodeName.charAt(0).toUpperCase() + nodeName.slice(1);
}

function getVersionString(version: number | number[]): string {
	if (Array.isArray(version)) {
		return `v${Math.max(...version)
			.toString()
			.replace('.', '_')}`;
	}
	return `v${version.toString().replace('.', '_')}`;
}

function mapPropertyTypeToTS(prop: NodeProperty): string {
	switch (prop.type) {
		case 'string':
			return 'string';
		case 'number':
			return 'number';
		case 'boolean':
			return 'boolean';
		case 'dateTime':
			return 'string'; // ISO date string
		case 'options':
			if (prop.options && prop.options.length > 0) {
				const values = prop.options.map((opt) => {
					const value = opt.value;
					if (typeof value === 'string') return `'${value}'`;
					if (typeof value === 'boolean') return `${value}`;
					return `${value}`;
				});
				return values.join(' | ');
			}
			return 'string';
		case 'collection':
		case 'fixedCollection':
			return 'Record<string, unknown>';
		case 'json':
			return 'string | object';
		case 'hidden':
		case 'notice':
			return 'unknown';
		default:
			return 'unknown';
	}
}

function generateParameterInterface(node: Node & { uniqueKey: string }): string | null {
	if (!node.properties || node.properties.length === 0) {
		return null;
	}

	const interfaceName = `${node.uniqueKey}Parameters`;
	const fields: string[] = [];

	// Properties that are already in BaseNodeParams with flexible types
	const baseParamNames = new Set([
		'returnAll',
		'limit',
		'resource',
		'operation',
		'additionalFields',
		'updateFields',
		'options',
		'filters',
	]);

	// Group properties by name to find common ones
	const propertyMap = new Map<string, NodeProperty>();
	for (const prop of node.properties) {
		if (!propertyMap.has(prop.name)) {
			propertyMap.set(prop.name, prop);
		}
	}

	// Common restricted identifiers that need quoting
	const restrictedIdentifiers = new Set([
		'number',
		'string',
		'boolean',
		'object',
		'function',
		'undefined',
		'null',
		'any',
		'unknown',
		'never',
		'void',
	]);

	for (const [, prop] of propertyMap) {
		const nodeProperties = prop as NodeProperty;
		const tsType = mapPropertyTypeToTS(nodeProperties);

		// Skip properties that are in BaseNodeParams if they have unknown or generic type
		// This prevents type conflicts while allowing specific unions to override
		if (baseParamNames.has(nodeProperties.name)) {
			if (tsType === 'unknown' || tsType === 'Record<string, unknown>') {
				continue; // Skip - use the base definition
			}
			// If it's a specific type (like a union of strings), include it to override
		}

		// Always make properties optional since n8n nodes have context-dependent requirements
		// (properties are conditionally required based on displayOptions/resource/operation)
		const comment = nodeProperties.displayName ? `\t/** ${nodeProperties.displayName} */\n` : '';

		// Quote property names if they're restricted identifiers
		const propName = restrictedIdentifiers.has(nodeProperties.name)
			? `'${nodeProperties.name}'`
			: nodeProperties.name;

		fields.push(`${comment}\t${propName}?: ${tsType};`);
	}

	if (fields.length === 0) {
		// If no specific properties, just extend BaseNodeParams
		return `export type ${interfaceName} = BaseNodeParams;`;
	}

	return `export interface ${interfaceName} extends BaseNodeParams {\n${fields.join('\n')}\n}`;
}

function deduplicateNodes(nodes: Node[]): Array<Node & { uniqueKey: string }> {
	const keyCount = new Map<string, number>();
	const result: Array<Node & { uniqueKey: string }> = [];

	// First pass: count occurrences of each key
	for (const node of nodes) {
		const baseKey = toPascalCase(node.name);
		keyCount.set(baseKey, (keyCount.get(baseKey) || 0) + 1);
	}

	// Second pass: create unique keys
	const usedKeys = new Map<string, number>();
	for (const node of nodes) {
		const baseKey = toPascalCase(node.name);
		let uniqueKey: string;

		const key = keyCount.get(baseKey);
		if (key && key > 1) {
			// Multiple versions exist, add version suffix
			const versionStr = getVersionString(node.version);
			uniqueKey = `${baseKey}_${versionStr}`;
		} else {
			uniqueKey = baseKey;
		}

		// Ensure uniqueness even with version suffix
		const useCount = usedKeys.get(uniqueKey) || 0;
		if (useCount > 0) {
			uniqueKey = `${uniqueKey}_${useCount}`;
		}
		usedKeys.set(uniqueKey, useCount + 1);

		result.push({ ...node, uniqueKey });
	}

	return result;
}

function generateNodeTypes(nodes: Node[]): string {
	const output: string[] = [];

	output.push('/* eslint-disable @typescript-eslint/naming-convention */\n');
	output.push('// Auto-generated node types from nodes.json\n');
	output.push('// This provides type-safe access to all n8n node types\n');
	output.push('// Note: Some nodes have multiple versions (e.g., Airtable_v1, Airtable_v2_1)\n\n');

	// Deduplicate nodes to handle multiple versions
	const deduplicatedNodes = deduplicateNodes(nodes);

	// Generate base parameter interfaces for common patterns
	output.push('// ===== Base Parameter Types =====\n\n');

	output.push('/** Common parameters for nodes that support pagination */\n');
	output.push('export interface PaginationParams {\n');
	output.push('\treturnAll?: boolean;\n');
	output.push('\tlimit?: number;\n');
	output.push('}\n\n');

	output.push('/** Common parameters for resource-based nodes */\n');
	output.push('export interface ResourceBasedParams {\n');
	output.push('\tresource?: string;\n');
	output.push('\toperation?: string;\n');
	output.push('}\n\n');

	output.push('/** Common parameters for nodes with additional/optional fields */\n');
	output.push('export interface ExtendableParams {\n');
	output.push('\tadditionalFields?: Record<string, unknown>;\n');
	output.push('\tupdateFields?: Record<string, unknown>;\n');
	output.push('\toptions?: Record<string, unknown>;\n');
	output.push('\tfilters?: Record<string, unknown>;\n');
	output.push('}\n\n');

	output.push('/** Base interface that most node parameters extend from */\n');
	output.push(
		'export interface BaseNodeParams extends PaginationParams, ResourceBasedParams, ExtendableParams {\n',
	);
	output.push('\t[key: string]: unknown;\n');
	output.push('}\n\n');

	// Generate node types constant
	output.push('// ===== Node Type Constants =====\n\n');
	output.push(
		'/** \n * Enumeration of all available n8n node types.\n * Use this for type-safe node type strings.\n * For nodes with multiple versions, version suffixes are added (e.g., Airtable_v2_1).\n */\n',
	);
	output.push('export const NodeTypes = {\n');

	for (const node of deduplicatedNodes) {
		output.push(`\t${node.uniqueKey}: '${node.name}' as const,\n`);
	}

	output.push('} as const;\n\n');

	// Generate node type union (deduplicated for the string values)
	output.push('/** Union type of all node type strings */\n');
	const uniqueNodeNames = [...new Set(nodes.map((n) => n.name))];
	const nodeTypeValues = uniqueNodeNames.map((name) => `\n\t| '${name}'`);
	output.push(`export type NodeType = ${nodeTypeValues.join('')};\n\n`);

	// Generate display name mapping (using deduplicated nodes)
	output.push('// ===== Display Name Mapping =====\n\n');
	output.push('/** Map of node types to their display names */\n');
	output.push('export const NodeDisplayNames: Record<NodeType, string> = {\n');

	// Use a map to ensure we only add each node name once
	const displayNameMap = new Map<string, string>();
	for (const node of nodes) {
		if (!displayNameMap.has(node.name)) {
			displayNameMap.set(node.name, node.displayName);
		}
	}

	for (const [name, displayName] of displayNameMap) {
		output.push(`\t'${name}': '${displayName}',\n`);
	}
	output.push('};\n\n');

	// Generate parameter interfaces for each node
	output.push('// ===== Node Parameter Interfaces =====\n\n');
	let generatedCount = 0;
	for (const node of deduplicatedNodes) {
		const interfaceCode = generateParameterInterface(node);
		if (interfaceCode) {
			output.push(interfaceCode);
			output.push('\n\n');
			generatedCount++;
		}
	}

	// Generate parameter map (only one entry per unique node name)
	output.push('// ===== Node Parameters Map =====\n\n');
	output.push('/** Map of node types to their parameter interfaces */\n');
	output.push('export interface NodeParametersMap {\n');

	const nodeNameToInterface = new Map<string, string>();
	for (const node of deduplicatedNodes) {
		if (node.properties && node.properties.length > 0) {
			const interfaceName = `${node.uniqueKey}Parameters`;
			// Only add if not already added (first version wins, which is typically the latest)
			if (!nodeNameToInterface.has(node.name)) {
				nodeNameToInterface.set(node.name, interfaceName);
			}
		}
	}

	for (const [nodeName, interfaceName] of nodeNameToInterface) {
		output.push(`\t'${nodeName}': ${interfaceName};\n`);
	}
	output.push('}\n\n');

	// Generate helper types
	output.push('// ===== Helper Types =====\n\n');

	output.push('/** Extract the value types from NodeTypes */\n');
	output.push('export type NodeTypeValue = (typeof NodeTypes)[keyof typeof NodeTypes];\n\n');

	output.push('/** Get parameters for a specific node type */\n');
	output.push(
		'export type GetNodeParameters<T extends NodeType> = T extends keyof NodeParametersMap\n',
	);
	output.push('\t? NodeParametersMap[T]\n');
	output.push('\t: BaseNodeParams;\n\n');

	output.push(
		'/** Generic node parameters type - use GetNodeParameters<T> for specific node types */\n',
	);
	output.push(
		'export type NodeParameters<T extends NodeType = NodeType> = T extends keyof NodeParametersMap\n',
	);
	output.push('\t? NodeParametersMap[T]\n');
	output.push('\t: BaseNodeParams;\n\n');

	// Add usage examples
	output.push('// ===== Usage Examples =====\n\n');
	output.push('/*\n');
	output.push(' * USAGE:\n');
	output.push(' * \n');
	output.push(' * 1. Type-safe node type strings:\n');
	output.push(' *    // For nodes with multiple versions, use the versioned key:\n');
	output.push(
		' *    const nodeType = NodeTypes.GoogleSheets_v4_7; // "n8n-nodes-base.googleSheets"\n',
	);
	output.push(
		' *    const simple = NodeTypes.ActionNetwork; // Single version nodes have no suffix\n',
	);
	output.push(' * \n');
	output.push(' * 2. Function accepting any node type:\n');
	output.push(' *    function processNode(type: NodeType) { ... }\n');
	output.push(' *    processNode(NodeTypes.Slack_v2_3); // Type-safe with version\n');
	output.push(' *    processNode("n8n-nodes-base.slack"); // Or use string literal directly\n');
	output.push(' * \n');
	output.push(' * 3. Get display name for a node:\n');
	output.push(' *    const nodeType = NodeTypes.GoogleSheets_v4_7;\n');
	output.push(' *    const displayName = NodeDisplayNames[nodeType]; // "Google Sheets"\n');
	output.push(' * \n');
	output.push(' * 4. Type node parameters:\n');
	output.push(' *    const params: NodeParameters = {\n');
	output.push(' *      resource: "sheet",\n');
	output.push(' *      operation: "read",\n');
	output.push(' *      returnAll: false,\n');
	output.push(' *      limit: 100\n');
	output.push(' *    };\n');
	output.push(' * \n');
	output.push(' * 5. Check if string is valid node type:\n');
	output.push(' *    function isNodeType(str: string): str is NodeType {\n');
	output.push(' *      return str in NodeDisplayNames;\n');
	output.push(' *    }\n');
	output.push(' */\n');

	return output.join('');
}

function main() {
	const nodesPath = join(__dirname, '..', 'tmp', 'nodes.json');
	const outputPath = join(__dirname, '..', 'src', 'nodeTypes.ts');

	console.log('Reading nodes.json...');
	const nodesData = readFileSync(nodesPath, 'utf-8');

	console.log('Parsing nodes...');
	try {
		const nodes = JSON.parse(nodesData) as Node[];
		console.log(`Found ${nodes.length} nodes`);

		console.log('Generating simplified TypeScript types...');
		const generatedCode = generateNodeTypes(nodes);

		console.log(`Writing to ${outputPath}...`);
		writeFileSync(outputPath, generatedCode, 'utf-8');

		// Count generated interfaces
		const interfaceCount = nodes.filter((n) => n.properties && n.properties.length > 0).length;

		console.log('✅ Done! Generated simplified types written to generated-node-types.ts');
		console.log('\nGenerated:');
		console.log(`  - ${nodes.length} nodes (${new Set(nodes.map((n) => n.name)).size} unique)`);
		console.log('  - NodeTypes enum with unique keys for each version');
		console.log('  - NodeType union type');
		console.log('  - NodeDisplayNames mapping');
		console.log(`  - ${interfaceCount} node parameter interfaces`);
		console.log('  - NodeParametersMap for type-safe parameter access');
		console.log('  - Base parameter interfaces for common patterns');
		console.log(`\nFile size: ~${Math.round(generatedCode.length / 1024)}KB`);
	} catch (error) {
		console.error('Failed to parse workflow JSON');
	}
}

main();
