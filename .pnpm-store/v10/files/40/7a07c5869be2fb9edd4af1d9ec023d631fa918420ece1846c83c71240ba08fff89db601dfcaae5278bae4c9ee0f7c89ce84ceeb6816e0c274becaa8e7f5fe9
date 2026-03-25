import {isOpeningParenToken, isCommaToken} from '@eslint-community/eslint-utils';

/** @typedef {import('estree').CallExpression} CallExpression */
/** @typedef {import('eslint').AST.Token} Token */

/**
Get the `openingParenthesisToken`, `closingParenthesisToken`, and `trailingCommaToken` of `CallExpression`.

@param {import('eslint').SourceCode} sourceCode - The source code object.
@param {CallExpression} callExpression - The `CallExpression` node.
@returns {{
	openingParenthesisToken: Token,
	closingParenthesisToken: Token,
	trailingCommaToken: Token | undefined,
}}
*/
export default function getCallExpressionTokens(sourceCode, callExpression) {
	const openingParenthesisToken = sourceCode.getTokenAfter(callExpression.callee, isOpeningParenToken);
	const [
		penultimateToken,
		closingParenthesisToken,
	] = sourceCode.getLastTokens(callExpression, 2);
	const trailingCommaToken = isCommaToken(penultimateToken) ? penultimateToken : undefined;

	return {
		openingParenthesisToken,
		closingParenthesisToken,
		trailingCommaToken,
	};
}
