import {hasSideEffect, isParenthesized, findVariable} from '@eslint-community/eslint-utils';
import {isMethodCall} from '../ast/index.js';
import {isSameIdentifier, isFunctionSelfUsedInside} from '../utils/index.js';

const isSimpleCompare = (node, compareNode) =>
	node.type === 'BinaryExpression'
	&& node.operator === '==='
	&& (
		isSameIdentifier(node.left, compareNode)
		|| isSameIdentifier(node.right, compareNode)
	);
const isSimpleCompareCallbackFunction = node =>
	// Matches `foo.findIndex(bar => bar === baz)`
	(
		node.type === 'ArrowFunctionExpression'
		&& !node.async
		&& node.params.length === 1
		&& isSimpleCompare(node.body, node.params[0])
	)
	// Matches `foo.findIndex(bar => {return bar === baz})`
	// Matches `foo.findIndex(function (bar) {return bar === baz})`
	|| (
		(node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression')
		&& !node.async
		&& !node.generator
		&& node.params.length === 1
		&& node.body.type === 'BlockStatement'
		&& node.body.body.length === 1
		&& node.body.body[0].type === 'ReturnStatement'
		&& isSimpleCompare(node.body.body[0].argument, node.params[0])
	);
const isIdentifierNamed = ({type, name}, expectName) => type === 'Identifier' && name === expectName;

export default function simpleArraySearchRule({method, replacement}) {
	// Add prefix to avoid conflicts in `prefer-includes` rule
	const MESSAGE_ID_PREFIX = `prefer-${replacement}-over-${method}/`;
	const ERROR = `${MESSAGE_ID_PREFIX}error`;
	const SUGGESTION = `${MESSAGE_ID_PREFIX}suggestion`;
	const ERROR_MESSAGES = {
		findIndex: 'Use `.indexOf()` instead of `.findIndex()` when looking for the index of an item.',
		findLastIndex: 'Use `.lastIndexOf()` instead of `findLastIndex() when looking for the index of an item.`',
		some: `Use \`.${replacement}()\` instead of \`.${method}()\` when checking value existence.`,
	};

	const messages = {
		[ERROR]: ERROR_MESSAGES[method],
		[SUGGESTION]: `Replace \`.${method}()\` with \`.${replacement}()\`.`,
	};

	function listen(context) {
		const {sourceCode} = context;
		const {scopeManager} = sourceCode;

		context.on('CallExpression', callExpression => {
			if (
				!isMethodCall(callExpression, {
					method,
					argumentsLength: 1,
					optionalCall: false,
					optionalMember: false,
				})
				|| !isSimpleCompareCallbackFunction(callExpression.arguments[0])
			) {
				return;
			}

			const [callback] = callExpression.arguments;
			const binaryExpression = callback.body.type === 'BinaryExpression'
				? callback.body
				: callback.body.body[0].argument;
			const [parameter] = callback.params;
			const {left, right} = binaryExpression;
			const {name} = parameter;

			let searchValueNode;
			let parameterInBinaryExpression;
			if (isIdentifierNamed(left, name)) {
				searchValueNode = right;
				parameterInBinaryExpression = left;
			} else if (isIdentifierNamed(right, name)) {
				searchValueNode = left;
				parameterInBinaryExpression = right;
			} else {
				return;
			}

			const callbackScope = scopeManager.acquire(callback);
			if (
				// `parameter` is used somewhere else
				findVariable(callbackScope, parameter).references.some(({identifier}) => identifier !== parameterInBinaryExpression)
				|| isFunctionSelfUsedInside(callback, callbackScope)
			) {
				return;
			}

			const methodNode = callExpression.callee.property;
			const problem = {
				node: methodNode,
				messageId: ERROR,
				suggest: [],
			};

			const fix = function * (fixer) {
				let text = sourceCode.getText(searchValueNode);
				if (isParenthesized(searchValueNode, sourceCode) && !isParenthesized(callback, sourceCode)) {
					text = `(${text})`;
				}

				yield fixer.replaceText(methodNode, replacement);
				yield fixer.replaceText(callback, text);
			};

			if (hasSideEffect(searchValueNode, sourceCode)) {
				problem.suggest.push({messageId: SUGGESTION, fix});
			} else {
				problem.fix = fix;
			}

			return problem;
		});
	}

	return {messages, listen};
}
