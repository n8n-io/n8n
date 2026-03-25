import {fixSpaceAroundKeyword, addParenthesizesToReturnOrThrowExpression} from './fix/index.js';
import {needsSemicolon, isParenthesized, isOnSameLine} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-negation-in-equality-check/error';
const MESSAGE_ID_SUGGESTION = 'no-negation-in-equality-check/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Negated expression is not allowed in equality check.',
	[MESSAGE_ID_SUGGESTION]: 'Switch to \'{{operator}}\' check.',
};

const EQUALITY_OPERATORS = new Set([
	'===',
	'!==',
	'==',
	'!=',
]);

const isEqualityCheck = node => node.type === 'BinaryExpression' && EQUALITY_OPERATORS.has(node.operator);
const isNegatedExpression = node => node.type === 'UnaryExpression' && node.prefix && node.operator === '!';

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	BinaryExpression(binaryExpression) {
		const {operator, left} = binaryExpression;

		if (!(
			isEqualityCheck(binaryExpression)
			&& isNegatedExpression(left)
			&& !isNegatedExpression(left.argument)
		)) {
			return;
		}

		const {sourceCode} = context;
		const bangToken = sourceCode.getFirstToken(left);
		const negatedOperator = `${operator.startsWith('!') ? '=' : '!'}${operator.slice(1)}`;

		return {
			node: bangToken,
			messageId: MESSAGE_ID_ERROR,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					data: {
						operator: negatedOperator,
					},
					/** @param {import('eslint').Rule.RuleFixer} fixer */
					* fix(fixer) {
						yield * fixSpaceAroundKeyword(fixer, binaryExpression, sourceCode);

						const tokenAfterBang = sourceCode.getTokenAfter(bangToken);

						const {parent} = binaryExpression;
						if (
							(parent.type === 'ReturnStatement' || parent.type === 'ThrowStatement')
							&& !isParenthesized(binaryExpression, sourceCode)
						) {
							const returnToken = sourceCode.getFirstToken(parent);
							if (!isOnSameLine(returnToken, tokenAfterBang)) {
								yield * addParenthesizesToReturnOrThrowExpression(fixer, parent, sourceCode);
							}
						}

						yield fixer.remove(bangToken);

						const previousToken = sourceCode.getTokenBefore(bangToken);
						if (needsSemicolon(previousToken, sourceCode, tokenAfterBang.value)) {
							yield fixer.insertTextAfter(bangToken, ';');
						}

						const operatorToken = sourceCode.getTokenAfter(
							left,
							token => token.type === 'Punctuator' && token.value === operator,
						);
						yield fixer.replaceText(operatorToken, negatedOperator);
					},
				},
			],
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow negated expression in equality check.',
			recommended: true,
		},

		hasSuggestions: true,
		messages,
	},
};

export default config;
