import type { ResolvableState } from '@/types/expressions';
import { ExpressionError, ExpressionParser } from 'n8n-workflow';

export const isExpression = (expr: string) => expr.startsWith('=');

export const isTestableExpression = (expr: string) => {
	return ExpressionParser.splitExpression(expr).every((c) => {
		if (c.type === 'text') {
			return true;
		}
		return /\$secrets(\.[a-zA-Z0-9_]+)+$/.test(c.text.trim());
	});
};

export const isNoExecDataExpressionError = (error: unknown): error is ExpressionError => {
	return error instanceof ExpressionError && error.context.type === 'no_execution_data';
};

export const isNoNodeExecDataExpressionError = (error: unknown): error is ExpressionError => {
	return error instanceof ExpressionError && error.context.type === 'no_node_execution_data';
};

export const isPairedItemIntermediateNodesError = (error: unknown): error is ExpressionError => {
	return (
		error instanceof ExpressionError && error.context.type === 'paired_item_intermediate_nodes'
	);
};

export const isPairedItemNoConnectionError = (error: unknown): error is ExpressionError => {
	return error instanceof ExpressionError && error.context.type === 'paired_item_no_connection';
};

export const isInvalidPairedItemError = (error: unknown): error is ExpressionError => {
	return error instanceof ExpressionError && error.context.type === 'paired_item_invalid_info';
};

export const isAnyPairedItemError = (error: unknown): error is ExpressionError => {
	return error instanceof ExpressionError && error.functionality === 'pairedItem';
};

export const getResolvableState = (error: unknown): ResolvableState => {
	if (!error) return 'valid';

	if (
		isNoExecDataExpressionError(error) ||
		isNoNodeExecDataExpressionError(error) ||
		isPairedItemIntermediateNodesError(error)
	) {
		return 'pending';
	}

	return 'invalid';
};
