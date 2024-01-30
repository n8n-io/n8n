import { ExpressionError, ExpressionParser } from 'n8n-workflow';
import type { ResolvableState } from '@/types/expressions';
import { i18n } from '@/plugins/i18n';

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

export const getResolvableState = (error: unknown): ResolvableState => {
	if (!error) return 'valid';

	if (isNoExecDataExpressionError(error) || isNoNodeExecDataExpressionError(error)) {
		return 'pending';
	}

	return 'invalid';
};

export const getExpressionErrorMessage = (error: Error): string => {
	if (isNoExecDataExpressionError(error)) {
		return i18n.baseText('expressionModalInput.noExecutionData');
	} else if (isNoNodeExecDataExpressionError(error)) {
		return i18n.baseText('expressionModalInput.noNodeExecutionData', {
			interpolate: { nodeName: error.context.nodeCause as string },
		});
	}

	return `[${error.message}]`;
};
