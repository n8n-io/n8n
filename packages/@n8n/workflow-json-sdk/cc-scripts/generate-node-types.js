#!/usr/bin/env node
'use strict';
var __assign =
	(this && this.__assign) ||
	function () {
		__assign =
			Object.assign ||
			function (t) {
				for (var s, i = 1, n = arguments.length; i < n; i++) {
					s = arguments[i];
					for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
				}
				return t;
			};
		return __assign.apply(this, arguments);
	};
var __spreadArray =
	(this && this.__spreadArray) ||
	function (to, from, pack) {
		if (pack || arguments.length === 2)
			for (var i = 0, l = from.length, ar; i < l; i++) {
				if (ar || !(i in from)) {
					if (!ar) ar = Array.prototype.slice.call(from, 0, i);
					ar[i] = from[i];
				}
			}
		return to.concat(ar || Array.prototype.slice.call(from));
	};
Object.defineProperty(exports, '__esModule', { value: true });
var fs_1 = require('fs');
var path_1 = require('path');
function toPascalCase(str) {
	// Convert n8n-nodes-base.actionNetwork to ActionNetwork
	var parts = str.split('.');
	var nodeName = parts[parts.length - 1];
	return nodeName.charAt(0).toUpperCase() + nodeName.slice(1);
}
function getVersionString(version) {
	if (Array.isArray(version)) {
		return 'v'.concat(Math.max.apply(Math, version).toString().replace('.', '_'));
	}
	return 'v'.concat(version.toString().replace('.', '_'));
}
function mapPropertyTypeToTS(prop) {
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
				var values = prop.options.map(function (opt) {
					var value = opt.value;
					if (typeof value === 'string') return "'".concat(value, "'");
					if (typeof value === 'boolean') return ''.concat(value);
					return ''.concat(value);
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
function generateParameterInterface(node) {
	if (!node.properties || node.properties.length === 0) {
		return null;
	}
	var interfaceName = ''.concat(node.uniqueKey, 'Parameters');
	var fields = [];
	// Properties that are already in BaseNodeParams with flexible types
	var baseParamNames = new Set([
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
	var propertyMap = new Map();
	for (var _i = 0, _a = node.properties; _i < _a.length; _i++) {
		var prop = _a[_i];
		if (!propertyMap.has(prop.name)) {
			propertyMap.set(prop.name, prop);
		}
	}
	// Common restricted identifiers that need quoting
	var restrictedIdentifiers = new Set([
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
	for (var _b = 0, propertyMap_1 = propertyMap; _b < propertyMap_1.length; _b++) {
		var _c = propertyMap_1[_b],
			prop = _c[1];
		var tsType = mapPropertyTypeToTS(prop);
		// Skip properties that are in BaseNodeParams if they have unknown or generic type
		// This prevents type conflicts while allowing specific unions to override
		if (baseParamNames.has(prop.name)) {
			if (tsType === 'unknown' || tsType === 'Record<string, unknown>') {
				continue; // Skip - use the base definition
			}
			// If it's a specific type (like a union of strings), include it to override
		}
		// Always make properties optional since n8n nodes have context-dependent requirements
		// (properties are conditionally required based on displayOptions/resource/operation)
		var comment = prop.displayName ? '\t/** '.concat(prop.displayName, ' */\n') : '';
		// Quote property names if they're restricted identifiers
		var propName = restrictedIdentifiers.has(prop.name) ? "'".concat(prop.name, "'") : prop.name;
		fields.push(''.concat(comment, '\t').concat(propName, '?: ').concat(tsType, ';'));
	}
	if (fields.length === 0) {
		// If no specific properties, just extend BaseNodeParams
		return 'export type '.concat(interfaceName, ' = BaseNodeParams;');
	}
	return 'export interface '
		.concat(interfaceName, ' extends BaseNodeParams {\n')
		.concat(fields.join('\n'), '\n}');
}
function deduplicateNodes(nodes) {
	var keyCount = new Map();
	var result = [];
	// First pass: count occurrences of each key
	for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
		var node = nodes_1[_i];
		var baseKey = toPascalCase(node.name);
		keyCount.set(baseKey, (keyCount.get(baseKey) || 0) + 1);
	}
	// Second pass: create unique keys
	var usedKeys = new Map();
	for (var _a = 0, nodes_2 = nodes; _a < nodes_2.length; _a++) {
		var node = nodes_2[_a];
		var baseKey = toPascalCase(node.name);
		var uniqueKey = void 0;
		if (keyCount.get(baseKey) > 1) {
			// Multiple versions exist, add version suffix
			var versionStr = getVersionString(node.version);
			uniqueKey = ''.concat(baseKey, '_').concat(versionStr);
		} else {
			uniqueKey = baseKey;
		}
		// Ensure uniqueness even with version suffix
		var useCount = usedKeys.get(uniqueKey) || 0;
		if (useCount > 0) {
			uniqueKey = ''.concat(uniqueKey, '_').concat(useCount);
		}
		usedKeys.set(uniqueKey, useCount + 1);
		result.push(__assign(__assign({}, node), { uniqueKey: uniqueKey }));
	}
	return result;
}
function generateNodeTypes(nodes) {
	var output = [];
	output.push('// Auto-generated node types from nodes.json\n');
	output.push('// This provides type-safe access to all n8n node types\n');
	output.push('// Note: Some nodes have multiple versions (e.g., Airtable_v1, Airtable_v2_1)\n\n');
	// Deduplicate nodes to handle multiple versions
	var deduplicatedNodes = deduplicateNodes(nodes);
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
	for (var _i = 0, deduplicatedNodes_1 = deduplicatedNodes; _i < deduplicatedNodes_1.length; _i++) {
		var node = deduplicatedNodes_1[_i];
		output.push('\t'.concat(node.uniqueKey, ": '").concat(node.name, "' as const,\n"));
	}
	output.push('} as const;\n\n');
	// Generate node type union (deduplicated for the string values)
	output.push('/** Union type of all node type strings */\n');
	var uniqueNodeNames = __spreadArray(
		[],
		new Set(
			nodes.map(function (n) {
				return n.name;
			}),
		),
		true,
	);
	var nodeTypeValues = uniqueNodeNames.map(function (name) {
		return "\n\t| '".concat(name, "'");
	});
	output.push('export type NodeType = '.concat(nodeTypeValues.join(''), ';\n\n'));
	// Generate display name mapping (using deduplicated nodes)
	output.push('// ===== Display Name Mapping =====\n\n');
	output.push('/** Map of node types to their display names */\n');
	output.push('export const NodeDisplayNames: Record<NodeType, string> = {\n');
	// Use a map to ensure we only add each node name once
	var displayNameMap = new Map();
	for (var _a = 0, nodes_3 = nodes; _a < nodes_3.length; _a++) {
		var node = nodes_3[_a];
		if (!displayNameMap.has(node.name)) {
			displayNameMap.set(node.name, node.displayName);
		}
	}
	for (var _b = 0, displayNameMap_1 = displayNameMap; _b < displayNameMap_1.length; _b++) {
		var _c = displayNameMap_1[_b],
			name_1 = _c[0],
			displayName = _c[1];
		output.push("\t'".concat(name_1, "': '").concat(displayName, "',\n"));
	}
	output.push('};\n\n');
	// Generate parameter interfaces for each node
	output.push('// ===== Node Parameter Interfaces =====\n\n');
	var generatedCount = 0;
	for (var _d = 0, deduplicatedNodes_2 = deduplicatedNodes; _d < deduplicatedNodes_2.length; _d++) {
		var node = deduplicatedNodes_2[_d];
		var interfaceCode = generateParameterInterface(node);
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
	var nodeNameToInterface = new Map();
	for (var _e = 0, deduplicatedNodes_3 = deduplicatedNodes; _e < deduplicatedNodes_3.length; _e++) {
		var node = deduplicatedNodes_3[_e];
		if (node.properties && node.properties.length > 0) {
			var interfaceName = ''.concat(node.uniqueKey, 'Parameters');
			// Only add if not already added (first version wins, which is typically the latest)
			if (!nodeNameToInterface.has(node.name)) {
				nodeNameToInterface.set(node.name, interfaceName);
			}
		}
	}
	for (
		var _f = 0, nodeNameToInterface_1 = nodeNameToInterface;
		_f < nodeNameToInterface_1.length;
		_f++
	) {
		var _g = nodeNameToInterface_1[_f],
			nodeName = _g[0],
			interfaceName = _g[1];
		output.push("\t'".concat(nodeName, "': ").concat(interfaceName, ';\n'));
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
	var nodesPath = (0, path_1.join)(__dirname, 'nodes.json');
	var outputPath = (0, path_1.join)(__dirname, 'generated-node-types.ts');
	console.log('Reading nodes.json...');
	var nodesData = (0, fs_1.readFileSync)(nodesPath, 'utf-8');
	console.log('Parsing nodes...');
	var nodes = JSON.parse(nodesData);
	console.log('Found '.concat(nodes.length, ' nodes'));
	console.log('Generating simplified TypeScript types...');
	var generatedCode = generateNodeTypes(nodes);
	console.log('Writing to '.concat(outputPath, '...'));
	(0, fs_1.writeFileSync)(outputPath, generatedCode, 'utf-8');
	// Count generated interfaces
	var interfaceCount = nodes.filter(function (n) {
		return n.properties && n.properties.length > 0;
	}).length;
	console.log('✅ Done! Generated simplified types written to generated-node-types.ts');
	console.log('\nGenerated:');
	console.log(
		'  - '.concat(nodes.length, ' nodes (').concat(
			new Set(
				nodes.map(function (n) {
					return n.name;
				}),
			).size,
			' unique)',
		),
	);
	console.log('  - NodeTypes enum with unique keys for each version');
	console.log('  - NodeType union type');
	console.log('  - NodeDisplayNames mapping');
	console.log('  - '.concat(interfaceCount, ' node parameter interfaces'));
	console.log('  - NodeParametersMap for type-safe parameter access');
	console.log('  - Base parameter interfaces for common patterns');
	console.log('\nFile size: ~'.concat(Math.round(generatedCode.length / 1024), 'KB'));
}
main();
