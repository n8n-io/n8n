import {isCommaToken} from '@eslint-community/eslint-utils';
import {isMethodCall, isExpressionStatement} from './ast/index.js';
import {
	getParenthesizedText,
	isParenthesized,
	needsSemicolon,
	shouldAddParenthesesToAwaitExpressionArgument,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-single-promise-in-promise-methods/error';
const MESSAGE_ID_SUGGESTION_UNWRAP = 'no-single-promise-in-promise-methods/unwrap';
const MESSAGE_ID_SUGGESTION_SWITCH_TO_PROMISE_RESOLVE = 'no-single-promise-in-promise-methods/use-promise-resolve';
const messages = {
	[MESSAGE_ID_ERROR]: 'Wrapping single-element array with `Promise.{{method}}()` is unnecessary.',
	[MESSAGE_ID_SUGGESTION_UNWRAP]: 'Use the value directly.',
	[MESSAGE_ID_SUGGESTION_SWITCH_TO_PROMISE_RESOLVE]: 'Switch to `Promise.resolve(…)`.',
};
const METHODS = ['all', 'any', 'race'];

const isPromiseMethodCallWithSingleElementArray = node =>
	isMethodCall(node, {
		object: 'Promise',
		methods: METHODS,
		optionalMember: false,
		optionalCall: false,
		argumentsLength: 1,
	})
	&& node.arguments[0].type === 'ArrayExpression'
	&& node.arguments[0].elements.length === 1
	&& node.arguments[0].elements[0]
	&& node.arguments[0].elements[0].type !== 'SpreadElement';

const unwrapAwaitedCallExpression = (callExpression, sourceCode) => fixer => {
	const [promiseNode] = callExpression.arguments[0].elements;
	let text = getParenthesizedText(promiseNode, sourceCode);

	if (
		!isParenthesized(promiseNode, sourceCode)
		&& shouldAddParenthesesToAwaitExpressionArgument(promiseNode)
	) {
		text = `(${text})`;
	}

	// The next node is already behind a `CallExpression`, there should be no ASI problem

	return fixer.replaceText(callExpression, text);
};

const unwrapNonAwaitedCallExpression = (callExpression, sourceCode) => fixer => {
	const [promiseNode] = callExpression.arguments[0].elements;
	let text = getParenthesizedText(promiseNode, sourceCode);

	if (
		!isParenthesized(promiseNode, sourceCode)
		// Since the original call expression can be anywhere, it's hard to tell if the promise
		// need to be parenthesized, but it's safe to add parentheses
		&& !(
			// Known cases that not need parentheses
			promiseNode.type === 'Identifier'
			|| promiseNode.type === 'MemberExpression'
		)
	) {
		text = `(${text})`;
	}

	const previousToken = sourceCode.getTokenBefore(callExpression);
	if (needsSemicolon(previousToken, sourceCode, text)) {
		text = `;${text}`;
	}

	return fixer.replaceText(callExpression, text);
};

const switchToPromiseResolve = (callExpression, sourceCode) => function * (fixer) {
	/*
	```
	Promise.race([promise,])
	//      ^^^^ methodNameNode
	```
	*/
	const methodNameNode = callExpression.callee.property;
	yield fixer.replaceText(methodNameNode, 'resolve');

	const [arrayExpression] = callExpression.arguments;
	/*
	```
	Promise.race([promise,])
	//           ^ openingBracketToken
	```
	*/
	const openingBracketToken = sourceCode.getFirstToken(arrayExpression);
	/*
	```
	Promise.race([promise,])
	//                   ^ penultimateToken
	//                    ^ closingBracketToken
	```
	*/
	const [
		penultimateToken,
		closingBracketToken,
	] = sourceCode.getLastTokens(arrayExpression, 2);

	yield fixer.remove(openingBracketToken);
	yield fixer.remove(closingBracketToken);

	if (isCommaToken(penultimateToken)) {
		yield fixer.remove(penultimateToken);
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(callExpression) {
		if (!isPromiseMethodCallWithSingleElementArray(callExpression)) {
			return;
		}

		const methodName = callExpression.callee.property.name;

		const problem = {
			node: callExpression.arguments[0],
			messageId: MESSAGE_ID_ERROR,
			data: {
				method: methodName,
			},
		};

		const {sourceCode} = context;

		if (
			callExpression.parent.type === 'AwaitExpression'
			&& callExpression.parent.argument === callExpression
			&& (
				methodName !== 'all'
				|| isExpressionStatement(callExpression.parent.parent)
			)
		) {
			problem.fix = unwrapAwaitedCallExpression(callExpression, sourceCode);
			return problem;
		}

		if (methodName === 'all') {
			return problem;
		}

		problem.suggest = [
			{
				messageId: MESSAGE_ID_SUGGESTION_UNWRAP,
				fix: unwrapNonAwaitedCallExpression(callExpression, sourceCode),
			},
			{
				messageId: MESSAGE_ID_SUGGESTION_SWITCH_TO_PROMISE_RESOLVE,
				fix: switchToPromiseResolve(callExpression, sourceCode),
			},
		];

		return problem;
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow passing single-element arrays to `Promise` methods.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
