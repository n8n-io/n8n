import {isMethodCall} from './ast/index.js';
import {
	isNodeMatches,
	isNodeValueNotFunction,
	isParenthesized,
	getParenthesizedRange,
	getParenthesizedText,
	shouldAddParenthesesToCallExpressionCallee,
} from './utils/index.js';

const ERROR_WITH_NAME_MESSAGE_ID = 'error-with-name';
const ERROR_WITHOUT_NAME_MESSAGE_ID = 'error-without-name';
const REPLACE_WITH_NAME_MESSAGE_ID = 'replace-with-name';
const REPLACE_WITHOUT_NAME_MESSAGE_ID = 'replace-without-name';
const messages = {
	[ERROR_WITH_NAME_MESSAGE_ID]: 'Do not pass function `{{name}}` directly to `.{{method}}(…)`.',
	[ERROR_WITHOUT_NAME_MESSAGE_ID]: 'Do not pass function directly to `.{{method}}(…)`.',
	[REPLACE_WITH_NAME_MESSAGE_ID]: 'Replace function `{{name}}` with `… => {{name}}({{parameters}})`.',
	[REPLACE_WITHOUT_NAME_MESSAGE_ID]: 'Replace function with `… => …({{parameters}})`.',
};

const isAwaitExpressionArgument = node => node.parent.type === 'AwaitExpression' && node.parent.argument === node;

const iteratorMethods = new Map([
	{
		method: 'every',
		ignore: [
			'Boolean',
		],
	},
	{
		method: 'filter',
		shouldIgnoreCallExpression: node => (node.callee.object.type === 'Identifier' && node.callee.object.name === 'Vue'),
		ignore: [
			'Boolean',
		],
	},
	{
		method: 'find',
		ignore: [
			'Boolean',
		],
	},
	{
		method: 'findLast',
		ignore: [
			'Boolean',
		],
	},
	{
		method: 'findIndex',
		ignore: [
			'Boolean',
		],
	},
	{
		method: 'findLastIndex',
		ignore: [
			'Boolean',
		],
	},
	{
		method: 'flatMap',
	},
	{
		method: 'forEach',
		returnsUndefined: true,
	},
	{
		method: 'map',
		shouldIgnoreCallExpression: node => (node.callee.object.type === 'Identifier' && node.callee.object.name === 'types'),
		ignore: [
			'String',
			'Number',
			'BigInt',
			'Boolean',
			'Symbol',
		],
	},
	{
		method: 'reduce',
		parameters: [
			'accumulator',
			'element',
			'index',
			'array',
		],
		minParameters: 2,
	},
	{
		method: 'reduceRight',
		parameters: [
			'accumulator',
			'element',
			'index',
			'array',
		],
		minParameters: 2,
	},
	{
		method: 'some',
		ignore: [
			'Boolean',
		],
	},
].map(({
	method,
	parameters = ['element', 'index', 'array'],
	ignore = [],
	minParameters = 1,
	returnsUndefined = false,
	shouldIgnoreCallExpression,
}) => [method, {
	minParameters,
	parameters,
	returnsUndefined,
	shouldIgnoreCallExpression(callExpression) {
		if (
			method !== 'reduce'
			&& method !== 'reduceRight'
			&& isAwaitExpressionArgument(callExpression)
		) {
			return true;
		}

		if (isNodeMatches(callExpression.callee.object, ignoredCallee)) {
			return true;
		}

		if (
			callExpression.callee.object.type === 'CallExpression'
			&& isNodeMatches(callExpression.callee.object.callee, ignoredCallee)
		) {
			return true;
		}

		return shouldIgnoreCallExpression?.(callExpression) ?? false;
	},
	shouldIgnoreCallback(callback) {
		if (callback.type === 'Identifier' && ignore.includes(callback.name)) {
			return true;
		}

		return false;
	},
}]));

const ignoredCallee = [
	// http://bluebirdjs.com/docs/api/promise.map.html
	'Promise',
	'React.Children',
	'Children',
	'lodash',
	'underscore',
	'_',
	'Async',
	'async',
	'this',
	'$',
	'jQuery',
];

function getProblem(context, node, method, options) {
	const {type} = node;

	const name = type === 'Identifier' ? node.name : '';

	const problem = {
		node,
		messageId: name ? ERROR_WITH_NAME_MESSAGE_ID : ERROR_WITHOUT_NAME_MESSAGE_ID,
		data: {
			name,
			method,
		},
	};

	if (node.type === 'YieldExpression' || node.type === 'AwaitExpression') {
		return problem;
	}

	problem.suggest = [];

	const {parameters, minParameters, returnsUndefined} = options;
	for (let parameterLength = minParameters; parameterLength <= parameters.length; parameterLength++) {
		const suggestionParameters = parameters.slice(0, parameterLength).join(', ');

		const suggest = {
			messageId: name ? REPLACE_WITH_NAME_MESSAGE_ID : REPLACE_WITHOUT_NAME_MESSAGE_ID,
			data: {
				name,
				parameters: suggestionParameters,
			},
			fix(fixer) {
				const {sourceCode} = context;
				let text = getParenthesizedText(node, sourceCode);

				if (
					!isParenthesized(node, sourceCode)
					&& shouldAddParenthesesToCallExpressionCallee(node)
				) {
					text = `(${text})`;
				}

				return fixer.replaceTextRange(
					getParenthesizedRange(node, sourceCode),
					returnsUndefined
						? `(${suggestionParameters}) => { ${text}(${suggestionParameters}); }`
						: `(${suggestionParameters}) => ${text}(${suggestionParameters})`,
				);
			},
		};

		problem.suggest.push(suggest);
	}

	return problem;
}

function * getTernaryConsequentAndALternate(node) {
	if (node.type === 'ConditionalExpression') {
		yield * getTernaryConsequentAndALternate(node.consequent);
		yield * getTernaryConsequentAndALternate(node.alternate);
		return;
	}

	yield node;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	* CallExpression(callExpression) {
		if (
			!isMethodCall(callExpression, {
				minimumArguments: 1,
				maximumArguments: 2,
				optionalCall: false,
				optionalMember: false,
				computed: false,
			})
			|| callExpression.callee.property.type !== 'Identifier'
		) {
			return;
		}

		const methodNode = callExpression.callee.property;
		const methodName = methodNode.name;
		if (!iteratorMethods.has(methodName)) {
			return;
		}

		const options = iteratorMethods.get(methodName);
		if (options.shouldIgnoreCallExpression(callExpression)) {
			return;
		}

		for (const callback of getTernaryConsequentAndALternate(callExpression.arguments[0])) {
			if (
				callback.type === 'FunctionExpression'
				|| callback.type === 'ArrowFunctionExpression'
				// Ignore all `CallExpression`s include `function.bind()`
				|| callback.type === 'CallExpression'
				|| options.shouldIgnoreCallback(callback)
				|| isNodeValueNotFunction(callback)
			) {
				continue;
			}

			yield getProblem(context, callback, methodName, options);
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Prevent passing a function reference directly to iterator methods.',
			recommended: true,
		},
		hasSuggestions: true,
		messages,
	},
};

export default config;
