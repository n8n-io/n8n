import {isMethodCall} from './ast/index.js';
import {removeSpacesAfter} from './fix/index.js';

const MESSAGE_ID_ERROR = 'no-await-in-promise-methods/error';
const MESSAGE_ID_SUGGESTION = 'no-await-in-promise-methods/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Promise in `Promise.{{method}}()` should not be awaited.',
	[MESSAGE_ID_SUGGESTION]: 'Remove `await`.',
};
const METHODS = ['all', 'allSettled', 'any', 'race'];

const isPromiseMethodCallWithArrayExpression = node =>
	isMethodCall(node, {
		object: 'Promise',
		methods: METHODS,
		optionalMember: false,
		optionalCall: false,
		argumentsLength: 1,
	})
	&& node.arguments[0].type === 'ArrayExpression';

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	* CallExpression(callExpression) {
		if (!isPromiseMethodCallWithArrayExpression(callExpression)) {
			return;
		}

		for (const element of callExpression.arguments[0].elements) {
			if (element?.type !== 'AwaitExpression') {
				continue;
			}

			yield {
				node: element,
				messageId: MESSAGE_ID_ERROR,
				data: {
					method: callExpression.callee.property.name,
				},
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						* fix(fixer) {
							const {sourceCode} = context;
							const awaitToken = context.sourceCode.getFirstToken(element);
							yield fixer.remove(awaitToken);
							yield removeSpacesAfter(awaitToken, sourceCode, fixer);
						},
					},
				],
			};
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow using `await` in `Promise` method parameters.',
			recommended: true,
		},
		hasSuggestions: true,
		messages,
	},
};

export default config;
