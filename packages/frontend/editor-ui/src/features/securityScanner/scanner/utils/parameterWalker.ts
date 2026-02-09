import { isExpression } from 'n8n-workflow';

export type ParameterVisitor = (value: string, path: string, isExpr: boolean) => void;

/**
 * Recursively walks all string leaf values in a node's parameters object,
 * calling the visitor with the value, dot-notation path, and whether it's an expression.
 */
export function walkParameters(params: unknown, visitor: ParameterVisitor, currentPath = ''): void {
	if (params === null || params === undefined) return;

	if (typeof params === 'string') {
		visitor(params, currentPath, isExpression(params));
		return;
	}

	if (typeof params === 'number' || typeof params === 'boolean') {
		return;
	}

	if (Array.isArray(params)) {
		for (let i = 0; i < params.length; i++) {
			walkParameters(params[i], visitor, currentPath ? `${currentPath}[${i}]` : `[${i}]`);
		}
		return;
	}

	if (typeof params === 'object') {
		for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
			walkParameters(value, visitor, currentPath ? `${currentPath}.${key}` : key);
		}
	}
}
