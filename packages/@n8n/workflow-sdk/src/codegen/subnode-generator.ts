/**
 * Subnode Generator
 *
 * Unified functions for generating subnode calls and config objects.
 * Supports both inline generation and variable reference modes.
 */

import {
	AI_CONNECTION_TO_CONFIG_KEY,
	AI_CONNECTION_TO_BUILDER,
	AI_ALWAYS_ARRAY_TYPES,
	AI_OPTIONAL_ARRAY_TYPES,
} from './constants';
import { generateDefaultNodeName } from './node-type-utils';
import {
	escapeString,
	formatKey,
	isPlaceholderValue,
	extractPlaceholderHint,
} from './string-utils';
import type { SemanticGraph, SemanticNode, AiConnectionType } from './types';

/**
 * Options for subnode generation
 */
export interface SubnodeGeneratorOptions {
	/** Use variable references instead of inline calls */
	useVarRefs: boolean;
}

/**
 * Context required for subnode generation
 */
interface SubnodeGenerationContext {
	graph: SemanticGraph;
	nodeNameToVarName: Map<string, string>;
	expressionAnnotations?: Map<string, string>;
}

/**
 * Get variable name for a node
 */
function getVarName(nodeName: string, ctx: SubnodeGenerationContext): string {
	return (
		ctx.nodeNameToVarName.get(nodeName) ?? nodeName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')
	);
}

/**
 * Context for formatValue - requires only expressionAnnotations
 */
export interface FormatValueContext {
	expressionAnnotations?: Map<string, string>;
	/** Current indentation level for multi-line formatting */
	indent?: number;
}

/**
 * Check if a value or any nested value contains an expression annotation
 */
function containsExpressionAnnotation(value: unknown, ctx?: FormatValueContext): boolean {
	if (!ctx?.expressionAnnotations || ctx.expressionAnnotations.size === 0) return false;

	if (typeof value === 'string') {
		return ctx.expressionAnnotations.has(value);
	}
	if (Array.isArray(value)) {
		return value.some((v) => containsExpressionAnnotation(v, ctx));
	}
	if (typeof value === 'object' && value !== null) {
		return Object.values(value).some((v) => containsExpressionAnnotation(v, ctx));
	}
	return false;
}

/**
 * Format a value for code output.
 * When expression annotations are present in an object, uses multi-line formatting.
 * Expression annotations use block comments on the line before the value.
 */
export function formatValue(value: unknown, ctx?: FormatValueContext): string {
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (typeof value === 'string') {
		// Check for placeholder values first
		if (isPlaceholderValue(value)) {
			const hint = extractPlaceholderHint(value);
			return `placeholder('${escapeString(hint)}')`;
		}
		if (value.startsWith('=')) {
			const inner = value.slice(1);
			const formatted = `expr('${escapeString(inner)}')`;
			if (ctx?.expressionAnnotations?.has(value)) {
				const annotation = ctx.expressionAnnotations.get(value)!;
				return `/** @example ${annotation} */\n${formatted}`;
			}
			return formatted;
		}
		const formatted = `'${escapeString(value)}'`;
		if (ctx?.expressionAnnotations?.has(value)) {
			const annotation = ctx.expressionAnnotations.get(value)!;
			return `/** @example ${annotation} */\n${formatted}`;
		}
		return formatted;
	}
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (Array.isArray(value)) {
		const innerCtx = ctx ? { ...ctx, indent: (ctx.indent ?? 0) + 1 } : ctx;
		const formattedElements = value.map((v) => formatValue(v, innerCtx));
		// Check if any element contains annotation - if so, use multi-line
		if (containsExpressionAnnotation(value, ctx)) {
			const baseIndent = '  '.repeat(ctx?.indent ?? 0);
			const elementIndent = '  '.repeat((ctx?.indent ?? 0) + 1);
			return `[\n${formattedElements.map((e) => `${elementIndent}${e}`).join(',\n')}\n${baseIndent}]`;
		}
		return `[${formattedElements.join(', ')}]`;
	}
	if (typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>);
		if (entries.length === 0) return '{}';

		const innerCtx = ctx ? { ...ctx, indent: (ctx.indent ?? 0) + 1 } : ctx;
		const formattedEntries = entries.map(([k, v]) => ({
			key: formatKey(k),
			value: formatValue(v, innerCtx),
		}));

		// Check if object contains any expression annotations - if so, use multi-line format
		if (containsExpressionAnnotation(value, ctx)) {
			const baseIndent = '  '.repeat(ctx?.indent ?? 0);
			const propIndent = '  '.repeat((ctx?.indent ?? 0) + 1);
			const lines = formattedEntries.map((e, i) => {
				const isLast = i === formattedEntries.length - 1;
				const valueLines = e.value.split('\n');

				// Check if this is a block comment before a value (not a nested object/array)
				// Block comments start with /** and the last line is the actual value
				const isBlockCommentPrefixed =
					valueLines.length > 1 &&
					valueLines[0].trim().startsWith('/**') &&
					!valueLines[valueLines.length - 1].trim().match(/^[}\]]$/);

				if (isBlockCommentPrefixed) {
					// Comment lines get property indent, last line is key: value
					const commentLines = valueLines.slice(0, -1).map((l) => `${propIndent}${l}`);
					const valueLine = `${propIndent}${e.key}: ${valueLines[valueLines.length - 1]}`;
					return [...commentLines, isLast ? valueLine : `${valueLine},`].join('\n');
				}

				// For nested objects/arrays or single-line values, add proper indentation
				if (valueLines.length > 1) {
					// Multi-line nested object/array - indent each line properly
					const indentedValue = valueLines
						.map((line, lineIdx) => (lineIdx === 0 ? line : `${propIndent}${line}`))
						.join('\n');
					const propLine = `${propIndent}${e.key}: ${indentedValue}`;
					return isLast ? propLine : `${propLine},`;
				}

				const propLine = `${propIndent}${e.key}: ${e.value}`;
				return isLast ? propLine : `${propLine},`;
			});
			return `{\n${lines.join('\n')}\n${baseIndent}}`;
		}

		return `{ ${formattedEntries.map((e) => `${e.key}: ${e.value}`).join(', ')} }`;
	}
	// eslint-disable-next-line @typescript-eslint/no-base-to-string -- Primitive values handled by String()
	return String(value);
}

/**
 * Generate the config parts common to both inline and varRef modes
 */
function generateSubnodeConfigParts(
	node: SemanticNode,
	ctx: SubnodeGenerationContext,
	options: SubnodeGeneratorOptions,
): string[] {
	const configParts: string[] = [];

	const defaultName = generateDefaultNodeName(node.type);
	if (node.json.name && node.json.name !== defaultName) {
		configParts.push(`name: '${escapeString(node.json.name)}'`);
	}

	if (node.json.parameters && Object.keys(node.json.parameters).length > 0) {
		configParts.push(`parameters: ${formatValue(node.json.parameters, ctx)}`);
	}

	if (node.json.credentials) {
		configParts.push(`credentials: ${formatValue(node.json.credentials, ctx)}`);
	}

	const pos = node.json.position;
	if (pos && (pos[0] !== 0 || pos[1] !== 0)) {
		configParts.push(`position: [${pos[0]}, ${pos[1]}]`);
	}

	// Recursively include nested subnodes
	const nestedConfig = generateSubnodesConfig(node, ctx, options);
	if (nestedConfig) {
		configParts.push(`subnodes: ${nestedConfig}`);
	}

	return configParts;
}

/**
 * Generate a subnode builder call (languageModel, tool, memory, etc.)
 *
 * @param node - The subnode to generate a call for
 * @param builderName - The builder function name (e.g., 'languageModel', 'tool')
 * @param ctx - Generation context
 * @param options - Options controlling generation behavior
 * @returns The generated builder call string
 */
export function generateSubnodeCall(
	node: SemanticNode,
	builderName: string,
	ctx: SubnodeGenerationContext,
	options: SubnodeGeneratorOptions,
): string {
	const parts: string[] = [];

	parts.push(`type: '${node.type}'`);
	parts.push(`version: ${node.json.typeVersion}`);

	const configParts = generateSubnodeConfigParts(node, ctx, options);

	if (configParts.length > 0) {
		parts.push(`config: { ${configParts.join(', ')} }`);
	} else {
		parts.push('config: {}');
	}

	return `${builderName}({ ${parts.join(', ')} })`;
}

/**
 * Generate subnodes config object for a node with AI subnodes.
 *
 * @param node - The parent node that has subnodes
 * @param ctx - Generation context
 * @param options - Options controlling generation behavior
 * @returns The generated config string, or null if no subnodes
 */
export function generateSubnodesConfig(
	node: SemanticNode,
	ctx: SubnodeGenerationContext,
	options: SubnodeGeneratorOptions,
): string | null {
	if (node.subnodes.length === 0) {
		return null;
	}

	if (options.useVarRefs) {
		return generateSubnodesConfigWithVarRefs(node, ctx);
	} else {
		return generateSubnodesConfigInline(node, ctx, options);
	}
}

/**
 * Generate subnodes config with inline calls
 */
function generateSubnodesConfigInline(
	node: SemanticNode,
	ctx: SubnodeGenerationContext,
	options: SubnodeGeneratorOptions,
): string | null {
	// Group subnodes by connection type
	const grouped = new Map<AiConnectionType, SemanticNode[]>();

	for (const sub of node.subnodes) {
		const subnodeNode = ctx.graph.nodes.get(sub.subnodeName);
		if (!subnodeNode) continue;

		const existing = grouped.get(sub.connectionType) ?? [];
		existing.push(subnodeNode);
		grouped.set(sub.connectionType, existing);
	}

	// Generate config entries
	const entries: string[] = [];

	for (const [connType, subnodeNodes] of grouped) {
		const configKey = AI_CONNECTION_TO_CONFIG_KEY[connType];
		const builderName = AI_CONNECTION_TO_BUILDER[connType];

		if (subnodeNodes.length === 0) continue;

		const calls = subnodeNodes.map((n) => generateSubnodeCall(n, builderName, ctx, options));

		if (AI_ALWAYS_ARRAY_TYPES.has(connType)) {
			entries.push(`${configKey}: [${calls.join(', ')}]`);
		} else if (AI_OPTIONAL_ARRAY_TYPES.has(connType)) {
			if (subnodeNodes.length === 1) {
				entries.push(`${configKey}: ${calls[0]}`);
			} else {
				entries.push(`${configKey}: [${calls.join(', ')}]`);
			}
		} else {
			entries.push(`${configKey}: ${calls[0]}`);
		}
	}

	if (entries.length === 0) {
		return null;
	}

	return `{ ${entries.join(', ')} }`;
}

/**
 * Generate subnodes config using variable references
 */
function generateSubnodesConfigWithVarRefs(
	node: SemanticNode,
	ctx: SubnodeGenerationContext,
): string | null {
	// Group subnodes by connection type, using variable names
	const grouped = new Map<AiConnectionType, string[]>();

	for (const sub of node.subnodes) {
		const varName = getVarName(sub.subnodeName, ctx);
		const existing = grouped.get(sub.connectionType) ?? [];
		existing.push(varName);
		grouped.set(sub.connectionType, existing);
	}

	// Generate config entries using variable names
	const entries: string[] = [];

	for (const [connType, varNames] of grouped) {
		const configKey = AI_CONNECTION_TO_CONFIG_KEY[connType];

		if (varNames.length === 0) continue;

		if (AI_ALWAYS_ARRAY_TYPES.has(connType)) {
			entries.push(`${configKey}: [${varNames.join(', ')}]`);
		} else if (AI_OPTIONAL_ARRAY_TYPES.has(connType)) {
			if (varNames.length === 1) {
				entries.push(`${configKey}: ${varNames[0]}`);
			} else {
				entries.push(`${configKey}: [${varNames.join(', ')}]`);
			}
		} else {
			entries.push(`${configKey}: ${varNames[0]}`);
		}
	}

	if (entries.length === 0) {
		return null;
	}

	return `{ ${entries.join(', ')} }`;
}
