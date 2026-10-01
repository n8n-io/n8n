import type { ExpressionValue } from './types';

/**
 * Build a flat map of expression strings to formatted resolved values.
 * Used to annotate expressions in generated code with @example comments.
 *
 * Creates two types of keys:
 * 1. Expression string key (e.g., '={{ $json.name }}') - for exact match
 * 2. Node::path key (e.g., 'Node::parameters.url') - for truncated expression lookup
 */
export function buildExpressionAnnotations(
	expressionValues?: Record<string, ExpressionValue[]>,
): Map<string, string> {
	const annotations = new Map<string, string>();

	if (!expressionValues) return annotations;

	for (const [nodeName, expressions] of Object.entries(expressionValues)) {
		for (const { expression, resolvedValue, parameterPath } of expressions) {
			const formattedValue = formatResolvedValue(resolvedValue);

			// Primary key: exact expression match (backwards compatible)
			annotations.set(expression, formattedValue);

			// Secondary key: node::path for truncated expression lookup
			if (parameterPath) {
				annotations.set(`${nodeName}::${parameterPath}`, formattedValue);
			}
		}
	}

	return annotations;
}

function formatResolvedValue(value: unknown): string {
	if (value === undefined || value === '<EMPTY>') {
		return 'undefined';
	}
	if (value === null || value === '[null]') {
		return 'null';
	}
	if (typeof value === 'string') {
		const maxLen = 250;
		return value.length > maxLen ? `"${value.slice(0, maxLen)}..."` : `"${value}"`;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	if (Array.isArray(value)) {
		return `[Array with ${value.length} items]`;
	}
	return '[Object]';
}
