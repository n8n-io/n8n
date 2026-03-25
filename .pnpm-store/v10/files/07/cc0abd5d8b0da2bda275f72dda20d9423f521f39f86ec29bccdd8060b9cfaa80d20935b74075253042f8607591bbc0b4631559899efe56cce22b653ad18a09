import {hasSideEffect} from '@eslint-community/eslint-utils';
import {removeArgument} from './fix/index.js';
import {getParentheses, getParenthesizedText} from './utils/parentheses.js';
import shouldAddParenthesesToMemberExpressionObject from './utils/should-add-parentheses-to-member-expression-object.js';
import {isNodeMatches} from './utils/is-node-matches.js';
import {isNodeValueNotFunction} from './utils/index.js';
import {isMethodCall} from './ast/index.js';

const ERROR_PROTOTYPE_METHOD = 'error-prototype-method';
const ERROR_STATIC_METHOD = 'error-static-method';
const SUGGESTION_BIND = 'suggestion-bind';
const SUGGESTION_REMOVE = 'suggestion-remove';
const messages = {
	[ERROR_PROTOTYPE_METHOD]: 'Do not use the `this` argument in `Array#{{method}}()`.',
	[ERROR_STATIC_METHOD]: 'Do not use the `this` argument in `Array.{{method}}()`.',
	[SUGGESTION_REMOVE]: 'Remove this argument.',
	[SUGGESTION_BIND]: 'Use a bound function.',
};

const ignored = [
	'lodash.every',
	'_.every',
	'underscore.every',

	'lodash.filter',
	'_.filter',
	'underscore.filter',
	'Vue.filter',
	'R.filter',

	'lodash.find',
	'_.find',
	'underscore.find',
	'R.find',

	'lodash.findLast',
	'_.findLast',
	'underscore.findLast',
	'R.findLast',

	'lodash.findIndex',
	'_.findIndex',
	'underscore.findIndex',
	'R.findIndex',

	'lodash.findLastIndex',
	'_.findLastIndex',
	'underscore.findLastIndex',
	'R.findLastIndex',

	'lodash.flatMap',
	'_.flatMap',

	'lodash.forEach',
	'_.forEach',
	'React.Children.forEach',
	'Children.forEach',
	'R.forEach',

	'lodash.map',
	'_.map',
	'underscore.map',
	'React.Children.map',
	'Children.map',
	'jQuery.map',
	'$.map',
	'R.map',

	'lodash.some',
	'_.some',
	'underscore.some',
];

function removeThisArgument(thisArgumentNode, sourceCode) {
	return fixer => removeArgument(fixer, thisArgumentNode, sourceCode);
}

function useBoundFunction(callbackNode, thisArgumentNode, sourceCode) {
	return function * (fixer) {
		yield removeThisArgument(thisArgumentNode, sourceCode)(fixer);

		const callbackParentheses = getParentheses(callbackNode, sourceCode);
		const isParenthesized = callbackParentheses.length > 0;
		const callbackLastToken = isParenthesized
			? callbackParentheses.at(-1)
			: callbackNode;
		if (
			!isParenthesized
			&& shouldAddParenthesesToMemberExpressionObject(callbackNode, sourceCode)
		) {
			yield fixer.insertTextBefore(callbackLastToken, '(');
			yield fixer.insertTextAfter(callbackLastToken, ')');
		}

		const thisArgumentText = getParenthesizedText(thisArgumentNode, sourceCode);
		// `thisArgument` was a argument, no need add extra parentheses
		yield fixer.insertTextAfter(callbackLastToken, `.bind(${thisArgumentText})`);
	};
}

function getProblem({
	sourceCode,
	callExpression,
	callbackNode,
	thisArgumentNode,
	messageId,
}) {
	const problem = {
		node: thisArgumentNode,
		messageId,
		data: {
			method: callExpression.callee.property.name,
		},
	};

	const isArrowCallback = callbackNode.type === 'ArrowFunctionExpression';
	if (isArrowCallback) {
		const thisArgumentHasSideEffect = hasSideEffect(thisArgumentNode, sourceCode);
		if (thisArgumentHasSideEffect) {
			problem.suggest = [
				{
					messageId: SUGGESTION_REMOVE,
					fix: removeThisArgument(thisArgumentNode, sourceCode),
				},
			];
		} else {
			problem.fix = removeThisArgument(thisArgumentNode, sourceCode);
		}

		return problem;
	}

	problem.suggest = [
		{
			messageId: SUGGESTION_REMOVE,
			fix: removeThisArgument(thisArgumentNode, sourceCode),
		},
		{
			messageId: SUGGESTION_BIND,
			fix: useBoundFunction(callbackNode, thisArgumentNode, sourceCode),
		},
	];

	return problem;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	// Prototype methods
	context.on('CallExpression', callExpression => {
		if (
			!isMethodCall(callExpression, {
				methods: [
					'every',
					'filter',
					'find',
					'findLast',
					'findIndex',
					'findLastIndex',
					'flatMap',
					'forEach',
					'map',
					'some',
				],
				argumentsLength: 2,
				optionalCall: false,
				optionalMember: false,
			})
			|| isNodeMatches(callExpression.callee, ignored)
			|| isNodeValueNotFunction(callExpression.arguments[0])
		) {
			return;
		}

		return getProblem({
			sourceCode,
			callExpression,
			callbackNode: callExpression.arguments[0],
			thisArgumentNode: callExpression.arguments[1],
			messageId: ERROR_PROTOTYPE_METHOD,
		});
	});

	// `Array.from()` and `Array.fromAsync()`
	context.on('CallExpression', callExpression => {
		if (
			!isMethodCall(callExpression, {
				object: 'Array',
				methods: ['from', 'fromAsync'],
				argumentsLength: 3,
				optionalCall: false,
				optionalMember: false,
			})
			|| isNodeValueNotFunction(callExpression.arguments[1])
		) {
			return;
		}

		return getProblem({
			sourceCode,
			callExpression,
			callbackNode: callExpression.arguments[1],
			thisArgumentNode: callExpression.arguments[2],
			messageId: ERROR_STATIC_METHOD,
		});
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow using the `this` argument in array methods.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
