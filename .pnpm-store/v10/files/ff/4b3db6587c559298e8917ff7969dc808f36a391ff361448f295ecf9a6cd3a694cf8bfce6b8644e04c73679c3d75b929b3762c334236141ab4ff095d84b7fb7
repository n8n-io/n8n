import {getFunctionHeadLocation} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'no-invalid-remove-event-listener';
const messages = {
	[MESSAGE_ID]: 'The listener argument should be a function reference.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(callExpression) {
		if (!(
			isMethodCall(callExpression, {
				method: 'removeEventListener',
				minimumArguments: 2,
				optionalCall: false,
				optionalMember: false,
			})
			&& callExpression.arguments[0].type !== 'SpreadElement'
			&& (
				callExpression.arguments[1].type === 'FunctionExpression'
				|| callExpression.arguments[1].type === 'ArrowFunctionExpression'
				|| isMethodCall(callExpression.arguments[1], {
					method: 'bind',
					optionalCall: false,
					optionalMember: false,
				})
			)
		)) {
			return;
		}

		const [, listener] = callExpression.arguments;
		if (['ArrowFunctionExpression', 'FunctionExpression'].includes(listener.type)) {
			return {
				node: listener,
				loc: getFunctionHeadLocation(listener, context.sourceCode),
				messageId: MESSAGE_ID,
			};
		}

		return {
			node: listener.callee.property,
			messageId: MESSAGE_ID,
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Prevent calling `EventTarget#removeEventListener()` with the result of an expression.',
			recommended: true,
		},
		messages,
	},
};

export default config;
