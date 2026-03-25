import {checkVueTemplate} from './utils/rule.js';
import {isBooleanNode, getParenthesizedRange, isNodeValueNotFunction} from './utils/index.js';
import {removeMemberExpressionProperty} from './fix/index.js';
import {
	isLiteral,
	isUndefined,
	isMethodCall,
	isMemberExpression,
} from './ast/index.js';

const ERROR_ID_ARRAY_SOME = 'some';
const SUGGESTION_ID_ARRAY_SOME = 'some-suggestion';
const ERROR_ID_ARRAY_FILTER = 'filter';
const messages = {
	[ERROR_ID_ARRAY_SOME]: 'Prefer `.some(…)` over `.{{method}}(…)`.',
	[SUGGESTION_ID_ARRAY_SOME]: 'Replace `.{{method}}(…)` with `.some(…)`.',
	[ERROR_ID_ARRAY_FILTER]: 'Prefer `.some(…)` over non-zero length check from `.filter(…)`.',
};

const isCheckingUndefined = node =>
	node.parent.type === 'BinaryExpression'
	// Not checking yoda expression `null != foo.find()` and `undefined !== foo.find()
	&& node.parent.left === node
	&& (
		(
			(
				node.parent.operator === '!='
				|| node.parent.operator === '=='
				|| node.parent.operator === '==='
				|| node.parent.operator === '!=='
			)
			&& isUndefined(node.parent.right)
		)
		|| (
			(
				node.parent.operator === '!='
				|| node.parent.operator === '=='
			)
			// eslint-disable-next-line unicorn/no-null
			&& isLiteral(node.parent.right, null)
		)
	);
const isNegativeOne = node => node.type === 'UnaryExpression' && node.operator === '-' && node.argument && node.argument.type === 'Literal' && node.argument.value === 1;
const isLiteralZero = node => isLiteral(node, 0);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	// `.find(…)`
	// `.findLast(…)`
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			methods: ['find', 'findLast'],
			minimumArguments: 1,
			maximumArguments: 2,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const isCompare = isCheckingUndefined(callExpression);
		if (!isCompare && !isBooleanNode(callExpression)) {
			return;
		}

		const methodNode = callExpression.callee.property;
		return {
			node: methodNode,
			messageId: ERROR_ID_ARRAY_SOME,
			data: {method: methodNode.name},
			suggest: [
				{
					messageId: SUGGESTION_ID_ARRAY_SOME,
					* fix(fixer) {
						yield fixer.replaceText(methodNode, 'some');

						if (!isCompare) {
							return;
						}

						const {sourceCode} = context;
						const parenthesizedRange = getParenthesizedRange(callExpression, sourceCode);
						yield fixer.removeRange([parenthesizedRange[1], sourceCode.getRange(callExpression.parent)[1]]);

						if (callExpression.parent.operator === '!=' || callExpression.parent.operator === '!==') {
							return;
						}

						yield fixer.insertTextBeforeRange(parenthesizedRange, '!');
					},
				},
			],
		};
	});

	// These operators also used in `prefer-includes`, try to reuse the code in future
	// `.{findIndex,findLastIndex}(…) !== -1`
	// `.{findIndex,findLastIndex}(…) != -1`
	// `.{findIndex,findLastIndex}(…) > -1`
	// `.{findIndex,findLastIndex}(…) === -1`
	// `.{findIndex,findLastIndex}(…) == -1`
	// `.{findIndex,findLastIndex}(…) >= 0`
	// `.{findIndex,findLastIndex}(…) < 0`
	context.on('BinaryExpression', binaryExpression => {
		const {left, right, operator} = binaryExpression;

		if (!(
			isMethodCall(left, {
				methods: ['findIndex', 'findLastIndex'],
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			&& (
				(['!==', '!=', '>', '===', '=='].includes(operator) && isNegativeOne(right))
				|| (['>=', '<'].includes(operator) && isLiteralZero(right))
			)
		)) {
			return;
		}

		const methodNode = left.callee.property;
		return {
			node: methodNode,
			messageId: ERROR_ID_ARRAY_SOME,
			data: {method: methodNode.name},
			* fix(fixer) {
				if (['===', '==', '<'].includes(operator)) {
					yield fixer.insertTextBefore(binaryExpression, '!');
				}

				yield fixer.replaceText(methodNode, 'some');

				const {sourceCode} = context;
				const operatorToken = sourceCode.getTokenAfter(
					left,
					token => token.type === 'Punctuator' && token.value === operator,
				);
				const [start] = sourceCode.getRange(operatorToken);
				const [, end] = sourceCode.getRange(binaryExpression);

				yield fixer.removeRange([start, end]);
			},
		};
	});

	// `.filter(…).length > 0`
	// `.filter(…).length !== 0`
	context.on('BinaryExpression', binaryExpression => {
		if (!(
			// We assume the user already follows `unicorn/explicit-length-check`. These are allowed in that rule.
			(binaryExpression.operator === '>' || binaryExpression.operator === '!==')
			&& binaryExpression.right.type === 'Literal'
			&& binaryExpression.right.raw === '0'
			&& isMemberExpression(binaryExpression.left, {property: 'length', optional: false})
			&& isMethodCall(binaryExpression.left.object, {
				method: 'filter',
				optionalCall: false,
				optionalMember: false,
			})
		)) {
			return;
		}

		const filterCall = binaryExpression.left.object;
		const [firstArgument] = filterCall.arguments;
		if (!firstArgument || isNodeValueNotFunction(firstArgument)) {
			return;
		}

		const filterProperty = filterCall.callee.property;
		return {
			node: filterProperty,
			messageId: ERROR_ID_ARRAY_FILTER,
			* fix(fixer) {
				// `.filter` to `.some`
				yield fixer.replaceText(filterProperty, 'some');

				const {sourceCode} = context;
				const lengthNode = binaryExpression.left;
				/*
					Remove `.length`
					`(( (( array.filter() )).length )) > (( 0 ))`
					------------------------^^^^^^^
				*/
				yield removeMemberExpressionProperty(fixer, lengthNode, sourceCode);

				/*
					Remove `> 0`
					`(( (( array.filter() )).length )) > (( 0 ))`
					----------------------------------^^^^^^^^^^
				*/
				yield fixer.removeRange([
					getParenthesizedRange(lengthNode, sourceCode)[1],
					sourceCode.getRange(binaryExpression)[1],
				]);

				// The `BinaryExpression` always ends with a number or `)`, no need check for ASI
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create: checkVueTemplate(create),
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.some(…)` over `.filter(…).length` check and `.{find,findLast,findIndex,findLastIndex}(…)`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
		hasSuggestions: true,
	},
};

export default config;
