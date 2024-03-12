import type { ResolvableState } from '@/types/expressions';
import { ExpressionError, ExpressionParser } from 'n8n-workflow';
import { i18n } from '@/plugins/i18n';
import { useWorkflowsStore } from '@/stores/workflows.store';

export const isExpression = (expr: unknown) => {
	if (typeof expr !== 'string') return false;
	return expr.startsWith('=');
};

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

export const isNoPairedItemError = (error: unknown): error is ExpressionError => {
	return error instanceof ExpressionError && error.context.type === 'paired_item_no_info';
};

export const isNoInputConnectionError = (error: unknown): error is ExpressionError => {
	return error instanceof ExpressionError && error.context.type === 'no_input_connection';
};

export const isAnyPairedItemError = (error: unknown): error is ExpressionError => {
	return error instanceof ExpressionError && error.context.functionality === 'pairedItem';
};

export const getResolvableState = (error: unknown, ignoreError = false): ResolvableState => {
	if (!error) return 'valid';

	if (
		isNoExecDataExpressionError(error) ||
		isNoNodeExecDataExpressionError(error) ||
		isPairedItemIntermediateNodesError(error) ||
		ignoreError
	) {
		return 'pending';
	}

	return 'invalid';
};

export const getExpressionErrorMessage = (error: Error): string => {
	if (isNoExecDataExpressionError(error) || isPairedItemIntermediateNodesError(error)) {
		return i18n.baseText('expressionModalInput.noExecutionData');
	}

	if (isNoNodeExecDataExpressionError(error)) {
		const nodeCause = error.context.nodeCause as string;
		return i18n.baseText('expressionModalInput.noNodeExecutionData', {
			interpolate: { node: nodeCause },
		});
	}
	if (isNoInputConnectionError(error)) {
		return i18n.baseText('expressionModalInput.noInputConnection');
	}

	if (isPairedItemNoConnectionError(error)) {
		return i18n.baseText('expressionModalInput.pairedItemConnectionError');
	}

	if (isInvalidPairedItemError(error) || isNoPairedItemError(error)) {
		const nodeCause = error.context.nodeCause as string;
		const isPinned = !!useWorkflowsStore().pinDataByNodeName(nodeCause);

		if (isPinned) {
			return i18n.baseText('expressionModalInput.pairedItemInvalidPinnedError', {
				interpolate: { node: nodeCause },
			});
		}
	}

	if (isAnyPairedItemError(error)) {
		return i18n.baseText('expressionModalInput.pairedItemError');
	}

	return error.message;
};
