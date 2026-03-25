import {hasSideEffect} from '@eslint-community/eslint-utils';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {isLiteral} from './ast/index.js';

const ERROR_BITWISE = 'error-bitwise';
const ERROR_BITWISE_NOT = 'error-bitwise-not';
const SUGGESTION_BITWISE = 'suggestion-bitwise';
const messages = {
	[ERROR_BITWISE]: 'Use `Math.trunc` instead of `{{operator}} {{value}}`.',
	[ERROR_BITWISE_NOT]: 'Use `Math.trunc` instead of `~~`.',
	[SUGGESTION_BITWISE]: 'Replace `{{operator}} {{value}}` with `Math.trunc`.',
};

// Bitwise operators
const bitwiseOperators = new Set(['|', '>>', '<<', '^']);
const isBitwiseNot = node =>
	node.type === 'UnaryExpression'
	&& node.operator === '~';

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	const mathTruncFunctionCall = node => {
		const text = sourceCode.getText(node);
		const parenthesized = node.type === 'SequenceExpression' ? `(${text})` : text;
		return `Math.trunc(${parenthesized})`;
	};

	context.on(['BinaryExpression', 'AssignmentExpression'], node => {
		const {type, operator, right, left} = node;
		const isAssignment = type === 'AssignmentExpression';
		if (
			!isLiteral(right, 0)
			|| !bitwiseOperators.has(isAssignment ? operator.slice(0, -1) : operator)
		) {
			return;
		}

		const problem = {
			node,
			messageId: ERROR_BITWISE,
			data: {
				operator,
				value: right.raw,
			},
		};

		if (!isAssignment || !hasSideEffect(left, sourceCode)) {
			const fix = function * (fixer) {
				const fixed = mathTruncFunctionCall(left);
				if (isAssignment) {
					const operatorToken = sourceCode.getTokenAfter(left, token => token.type === 'Punctuator' && token.value === operator);
					yield fixer.replaceText(operatorToken, '=');
					yield fixer.replaceText(right, fixed);
				} else {
					yield * fixSpaceAroundKeyword(fixer, node, sourceCode);
					yield fixer.replaceText(node, fixed);
				}
			};

			if (operator === '|') {
				problem.suggest = [
					{
						messageId: SUGGESTION_BITWISE,
						fix,
					},
				];
			} else {
				problem.fix = fix;
			}
		}

		return problem;
	});

	// Unary Expression Selector: Inner-most 2 bitwise NOT
	context.on('UnaryExpression', node => {
		if (
			isBitwiseNot(node)
			&& isBitwiseNot(node.argument)
			&& !isBitwiseNot(node.argument.argument)
		) {
			return {
				node,
				messageId: ERROR_BITWISE_NOT,
				* fix(fixer) {
					yield fixer.replaceText(node, mathTruncFunctionCall(node.argument.argument));
					yield * fixSpaceAroundKeyword(fixer, node, sourceCode);
				},
			};
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce the use of `Math.trunc` instead of bitwise operators.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
