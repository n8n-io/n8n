import {isLiteral} from './ast/index.js';
import {
	addParenthesizesToReturnOrThrowExpression,
	removeSpacesAfter,
} from './fix/index.js';
import {
	needsSemicolon,
	isParenthesized,
	isOnSameLine,
	isShadowed,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-typeof-undefined/error';
const MESSAGE_ID_SUGGESTION = 'no-typeof-undefined/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Compare with `undefined` directly instead of using `typeof`.',
	[MESSAGE_ID_SUGGESTION]: 'Switch to `… {{operator}} undefined`.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {
		checkGlobalVariables,
	} = {
		checkGlobalVariables: false,
		...context.options[0],
	};

	const {sourceCode} = context;

	return {
		BinaryExpression(binaryExpression) {
			if (!(
				(
					binaryExpression.operator === '==='
					|| binaryExpression.operator === '!=='
					|| binaryExpression.operator === '=='
					|| binaryExpression.operator === '!='
				)
				&& binaryExpression.left.type === 'UnaryExpression'
				&& binaryExpression.left.operator === 'typeof'
				&& binaryExpression.left.prefix
				&& isLiteral(binaryExpression.right, 'undefined')
			)) {
				return;
			}

			const {left: typeofNode, right: undefinedString, operator} = binaryExpression;

			const valueNode = typeofNode.argument;
			const isGlobalVariable = valueNode.type === 'Identifier'
				&& !isShadowed(sourceCode.getScope(valueNode), valueNode);

			if (!checkGlobalVariables && isGlobalVariable) {
				return;
			}

			const [typeofToken, secondToken] = sourceCode.getFirstTokens(typeofNode, 2);

			const fix = function * (fixer) {
				// Change `==`/`!=` to `===`/`!==`
				if (operator === '==' || operator === '!=') {
					const operatorToken = sourceCode.getTokenAfter(
						typeofNode,
						token => token.type === 'Punctuator' && token.value === operator,
					);

					yield fixer.insertTextAfter(operatorToken, '=');
				}

				yield fixer.replaceText(undefinedString, 'undefined');

				yield fixer.remove(typeofToken);
				yield removeSpacesAfter(typeofToken, sourceCode, fixer);

				const {parent} = binaryExpression;
				if (
					(parent.type === 'ReturnStatement' || parent.type === 'ThrowStatement')
					&& parent.argument === binaryExpression
					&& !isOnSameLine(typeofToken, secondToken)
					&& !isParenthesized(binaryExpression, sourceCode)
					&& !isParenthesized(typeofNode, sourceCode)
				) {
					yield * addParenthesizesToReturnOrThrowExpression(fixer, parent, sourceCode);
					return;
				}

				const tokenBefore = sourceCode.getTokenBefore(binaryExpression);
				if (needsSemicolon(tokenBefore, sourceCode, secondToken.value)) {
					yield fixer.insertTextBefore(binaryExpression, ';');
				}
			};

			const problem = {
				node: binaryExpression,
				loc: sourceCode.getLoc(typeofToken),
				messageId: MESSAGE_ID_ERROR,
			};

			if (isGlobalVariable) {
				problem.suggest = [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						data: {operator: operator.startsWith('!') ? '!==' : '==='},
						fix,
					},
				];
			} else {
				problem.fix = fix;
			}

			return problem;
		},
	};
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			checkGlobalVariables: {
				type: 'boolean',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow comparing `undefined` using `typeof`.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [{checkGlobalVariables: false}],
		messages,
	},
};

export default config;
