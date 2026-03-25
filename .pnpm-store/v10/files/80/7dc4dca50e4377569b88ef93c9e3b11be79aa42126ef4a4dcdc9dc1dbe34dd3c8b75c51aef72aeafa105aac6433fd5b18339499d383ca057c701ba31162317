import getCallExpressionTokens from './get-call-expression-tokens.js';

/** @typedef {import('estree').CallExpression} CallExpression */

/**
Get the text of the arguments list of `CallExpression`.

@param {import('eslint').SourceCode} sourceCode - The source code object.
@param {CallExpression} callExpression - The `CallExpression` node.
@param {SourceCode} sourceCode - The source code object.
@returns {string}
*/
export default function getCallExpressionArgumentsText(sourceCode, callExpression) {
	const {
		openingParenthesisToken,
		closingParenthesisToken,
	} = getCallExpressionTokens(sourceCode, callExpression);

	const [, start] = sourceCode.getRange(openingParenthesisToken);
	const [end] = sourceCode.getRange(closingParenthesisToken);

	return sourceCode.text.slice(start, end);
}
