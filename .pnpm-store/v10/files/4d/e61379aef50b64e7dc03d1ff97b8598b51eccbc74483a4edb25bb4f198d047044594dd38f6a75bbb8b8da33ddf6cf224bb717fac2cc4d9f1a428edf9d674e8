import {isParenthesized, isNotSemicolonToken} from '@eslint-community/eslint-utils';
import {needsSemicolon} from './utils/index.js';
import {removeSpacesAfter} from './fix/index.js';

const MESSAGE_ID = 'no-lonely-if';
const messages = {
	[MESSAGE_ID]: 'Unexpected `if` as the only statement in a `if` block without `else`.',
};

const isIfStatementWithoutAlternate = node => node.type === 'IfStatement' && !node.alternate;

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#Table
// Lower precedence than `&&`
const needParenthesis = node => (
	(node.type === 'LogicalExpression' && (node.operator === '||' || node.operator === '??'))
	|| node.type === 'ConditionalExpression'
	|| node.type === 'AssignmentExpression'
	|| node.type === 'YieldExpression'
	|| node.type === 'SequenceExpression'
);

function getIfStatementTokens(node, sourceCode) {
	const tokens = {};

	tokens.ifToken = sourceCode.getFirstToken(node);
	tokens.openingParenthesisToken = sourceCode.getFirstToken(node, 1);

	const {consequent} = node;
	tokens.closingParenthesisToken = sourceCode.getTokenBefore(consequent);

	if (consequent.type === 'BlockStatement') {
		tokens.openingBraceToken = sourceCode.getFirstToken(consequent);
		tokens.closingBraceToken = sourceCode.getLastToken(consequent);
	}

	return tokens;
}

function fix(innerIfStatement, sourceCode) {
	return function * (fixer) {
		const outerIfStatement = (
			innerIfStatement.parent.type === 'BlockStatement'
				? innerIfStatement.parent
				: innerIfStatement
		).parent;
		const outer = {
			...outerIfStatement,
			...getIfStatementTokens(outerIfStatement, sourceCode),
		};
		const inner = {
			...innerIfStatement,
			...getIfStatementTokens(innerIfStatement, sourceCode),
		};

		// Remove inner `if` token
		yield fixer.remove(inner.ifToken);
		yield removeSpacesAfter(inner.ifToken, sourceCode, fixer);

		// Remove outer `{}`
		if (outer.openingBraceToken) {
			yield fixer.remove(outer.openingBraceToken);
			yield removeSpacesAfter(outer.openingBraceToken, sourceCode, fixer);
			yield fixer.remove(outer.closingBraceToken);

			const tokenBefore = sourceCode.getTokenBefore(outer.closingBraceToken, {includeComments: true});
			yield removeSpacesAfter(tokenBefore, sourceCode, fixer);
		}

		// Add new `()`
		yield fixer.insertTextBefore(outer.openingParenthesisToken, '(');
		yield fixer.insertTextAfter(
			inner.closingParenthesisToken,
			`)${inner.consequent.type === 'EmptyStatement' ? '' : ' '}`,
		);

		// Add ` && `
		yield fixer.insertTextAfter(outer.closingParenthesisToken, ' && ');

		// Remove `()` if `test` don't need it
		for (const {test, openingParenthesisToken, closingParenthesisToken} of [outer, inner]) {
			if (
				isParenthesized(test, sourceCode)
				|| !needParenthesis(test)
			) {
				yield fixer.remove(openingParenthesisToken);
				yield fixer.remove(closingParenthesisToken);
			}

			yield removeSpacesAfter(closingParenthesisToken, sourceCode, fixer);
		}

		// If the `if` statement has no block, and is not followed by a semicolon,
		// make sure that fixing the issue would not change semantics due to ASI.
		// Similar logic https://github.com/eslint/eslint/blob/2124e1b5dad30a905dc26bde9da472bf622d3f50/lib/rules/no-lonely-if.js#L61-L77
		if (inner.consequent.type !== 'BlockStatement') {
			const lastToken = sourceCode.getLastToken(inner.consequent);
			if (isNotSemicolonToken(lastToken)) {
				const nextToken = sourceCode.getTokenAfter(outer);
				if (nextToken && needsSemicolon(lastToken, sourceCode, nextToken.value)) {
					yield fixer.insertTextBefore(nextToken, ';');
				}
			}
		}
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	IfStatement(ifStatement) {
		if (!(
			isIfStatementWithoutAlternate(ifStatement)
			&& (
				// `if (a) { if (b) {} }`
				(
					ifStatement.parent.type === 'BlockStatement'
					&& ifStatement.parent.body.length === 1
					&& ifStatement.parent.body[0] === ifStatement
					&& isIfStatementWithoutAlternate(ifStatement.parent.parent)
					&& ifStatement.parent.parent.consequent === ifStatement.parent
				)
				// `if (a) if (b) {}`
				|| (
					isIfStatementWithoutAlternate(ifStatement.parent)
					&& ifStatement.parent.consequent === ifStatement
				)
			)
		)) {
			return;
		}

		return {
			node: ifStatement,
			messageId: MESSAGE_ID,
			fix: fix(ifStatement, context.sourceCode),
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow `if` statements as the only statement in `if` blocks without `else`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
