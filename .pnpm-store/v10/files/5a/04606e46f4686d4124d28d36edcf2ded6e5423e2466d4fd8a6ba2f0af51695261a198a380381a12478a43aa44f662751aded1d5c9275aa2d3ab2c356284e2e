import {isOpeningParenToken, isClosingParenToken} from '@eslint-community/eslint-utils';

/**
Determine if a constructor function is newed-up with parens.

@param {Node} node - The `NewExpression` node to be checked.
@param {SourceCode} sourceCode - The source code object.
@returns {boolean} True if the constructor is called with parens.

Copied from https://github.com/eslint/eslint/blob/cc4871369645c3409dc56ded7a555af8a9f63d51/lib/rules/no-extra-parens.js#L252
*/
export default function isNewExpressionWithParentheses(node, sourceCode) {
	if (node.arguments.length > 0) {
		return true;
	}

	const [penultimateToken, lastToken] = sourceCode.getLastTokens(node, 2);
	// The expression should end with its own parens, for example, `new new Foo()` is not a new expression with parens.
	return isOpeningParenToken(penultimateToken)
		&& isClosingParenToken(lastToken)
		&& sourceCode.getRange(node.callee)[1] < sourceCode.getRange(node)[1];
}
