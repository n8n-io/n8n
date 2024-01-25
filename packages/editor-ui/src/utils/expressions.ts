import { ExpressionError, ExpressionParser } from 'n8n-workflow';
import type { ResolvableState } from '../types/expressions';

export const isExpression = (expr: string) => expr.startsWith('=');

export const isTestableExpression = (expr: string) => {
	return ExpressionParser.splitExpression(expr).every((c) => {
		if (c.type === 'text') {
			return true;
		}
		return /\$secrets(\.[a-zA-Z0-9_]+)+$/.test(c.text.trim());
	});
};

export const isNoExecDataExpressionError = (error: unknown): boolean => {
	return error instanceof ExpressionError && error.context.type === 'no_execution_data';
};

export const getResolvableState = (error: unknown): ResolvableState => {
	if (!error) return 'valid';

	if (isNoExecDataExpressionError(error)) {
		return 'pending';
	}

	return 'invalid';
};
