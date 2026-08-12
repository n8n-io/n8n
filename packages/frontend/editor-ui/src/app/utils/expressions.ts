import { i18n } from '@n8n/i18n';
import { getExpressionErrorMessage, getResolvableState } from '@n8n/expression-editor';
import type { Result } from '@n8n/utils/result';
import { ExpressionParser, type IPinData } from 'n8n-workflow';

export {
	completeExpressionSyntax,
	getExpressionErrorMessage,
	getResolvableState,
	isAnyPairedItemError,
	isEmptyExpression,
	isExpression,
	isInvalidPairedItemError,
	isNoExecDataExpressionError,
	isNoInputConnectionError,
	isNoNodeExecDataExpressionError,
	isNoPairedItemError,
	isPairedItemIntermediateNodesError,
	isPairedItemNoConnectionError,
	removeExpressionPrefix,
	shouldConvertToExpression,
	unwrapExpression,
} from '@n8n/expression-editor';

export const isTestableExpression = (expr: string) => {
	return ExpressionParser.splitExpression(expr).every((c) => {
		if (c.type === 'text') {
			return true;
		}
		return /\$secrets(\.[a-zA-Z0-9_]+)+$/.test(c.text.trim());
	});
};

export const stringifyExpressionResult = (
	result: Result<unknown, Error>,
	pinData: IPinData,
	nodeHasRunData = false,
): string => {
	if (!result.ok) {
		if (getResolvableState(result.error) !== 'invalid') {
			return '';
		}

		return `[${i18n.baseText('parameterInput.error')}: ${getExpressionErrorMessage(result.error, pinData, nodeHasRunData)}]`;
	}

	if (result.result === null) {
		return '';
	}

	if (typeof result.result === 'string' && result.result.length === 0) {
		return i18n.baseText('parameterInput.emptyString');
	}

	return typeof result.result === 'string' ? result.result : String(result.result);
};
