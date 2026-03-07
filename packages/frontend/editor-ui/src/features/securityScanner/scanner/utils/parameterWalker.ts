import type { INodeUi } from '@/Interface';
import { isExpression } from 'n8n-workflow';

export type ParameterVisitor = (value: string, path: string, isExpr: boolean) => void;

export function getNodeParam<T = unknown>(node: INodeUi, key: string): T | undefined {
	return (node.parameters as Record<string, unknown> | undefined)?.[key] as T | undefined;
}

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
