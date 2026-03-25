/*
Based on ESLint builtin `no-negated-condition` rule
https://github.com/eslint/eslint/blob/5c39425fc55ecc0b97bbd07ac22654c0eb4f789c/lib/rules/no-negated-condition.js
*/
import {
	removeParentheses,
	fixSpaceAroundKeyword,
	addParenthesizesToReturnOrThrowExpression,
} from './fix/index.js';
import {getParenthesizedRange, isParenthesized} from './utils/parentheses.js';
import isOnSameLine from './utils/is-on-same-line.js';
import needsSemicolon from './utils/needs-semicolon.js';

const MESSAGE_ID = 'no-negated-condition';
const messages = {
	[MESSAGE_ID]: 'Unexpected negated condition.',
};

function * convertNegatedCondition(fixer, node, sourceCode) {
	const {test} = node;
	if (test.type === 'UnaryExpression') {
		const token = sourceCode.getFirstToken(test);

		if (node.type === 'IfStatement') {
			yield * removeParentheses(test.argument, fixer, sourceCode);
		}

		yield fixer.remove(token);
		return;
	}

	const token = sourceCode.getTokenAfter(
		test.left,
		token => token.type === 'Punctuator' && token.value === test.operator,
	);

	yield fixer.replaceText(token, '=' + token.value.slice(1));
}

function * swapConsequentAndAlternate(fixer, node, sourceCode) {
	const isIfStatement = node.type === 'IfStatement';
	const [consequent, alternate] = [
		node.consequent,
		node.alternate,
	].map(node => {
		const range = getParenthesizedRange(node, sourceCode);
		let text = sourceCode.text.slice(...range);
		// `if (!a) b(); else c()` can't fix to `if (!a) c() else b();`
		if (isIfStatement && node.type !== 'BlockStatement') {
			text = `{${text}}`;
		}

		return {
			range,
			text,
		};
	});

	if (consequent.text === alternate.text) {
		return;
	}

	yield fixer.replaceTextRange(sourceCode.getRange(consequent), alternate.text);
	yield fixer.replaceTextRange(sourceCode.getRange(alternate), consequent.text);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on(['IfStatement', 'ConditionalExpression'], node => {
		if (
			node.type === 'IfStatement'
			&& (
				!node.alternate
				|| node.alternate.type === 'IfStatement'
			)
		) {
			return;
		}

		const {test} = node;

		if (!(
			(test.type === 'UnaryExpression' && test.operator === '!')
			|| (test.type === 'BinaryExpression' && (test.operator === '!=' || test.operator === '!=='))
		)) {
			return;
		}

		return {
			node: test,
			messageId: MESSAGE_ID,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer) {
				const {sourceCode} = context;
				yield * convertNegatedCondition(fixer, node, sourceCode);
				yield * swapConsequentAndAlternate(fixer, node, sourceCode);

				if (
					node.type !== 'ConditionalExpression'
					|| test.type !== 'UnaryExpression'
				) {
					return;
				}

				yield * fixSpaceAroundKeyword(fixer, node, sourceCode);

				const {parent} = node;
				const [firstToken, secondToken] = sourceCode.getFirstTokens(test, 2);
				if (
					(parent.type === 'ReturnStatement' || parent.type === 'ThrowStatement')
					&& parent.argument === node
					&& !isOnSameLine(firstToken, secondToken)
					&& !isParenthesized(node, sourceCode)
					&& !isParenthesized(test, sourceCode)
				) {
					yield * addParenthesizesToReturnOrThrowExpression(fixer, parent, sourceCode);
					return;
				}

				const tokenBefore = sourceCode.getTokenBefore(node);
				if (needsSemicolon(tokenBefore, sourceCode, secondToken.value)) {
					yield fixer.insertTextBefore(node, ';');
				}
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow negated conditions.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
