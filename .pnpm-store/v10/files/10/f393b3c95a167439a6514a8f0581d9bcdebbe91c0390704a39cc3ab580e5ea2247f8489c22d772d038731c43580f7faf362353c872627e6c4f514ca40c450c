import {getStaticValue} from '@eslint-community/eslint-utils';
import isShadowed from './utils/is-shadowed.js';
import {isCallOrNewExpression} from './ast/index.js';
import builtinErrors from './shared/builtin-errors.js';

const MESSAGE_ID_MISSING_MESSAGE = 'missing-message';
const MESSAGE_ID_EMPTY_MESSAGE = 'message-is-empty-string';
const MESSAGE_ID_NOT_STRING = 'message-is-not-a-string';
const messages = {
	[MESSAGE_ID_MISSING_MESSAGE]: 'Pass a message to the `{{constructorName}}` constructor.',
	[MESSAGE_ID_EMPTY_MESSAGE]: 'Error message should not be an empty string.',
	[MESSAGE_ID_NOT_STRING]: 'Error message should be a string.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on(['CallExpression', 'NewExpression'], expression => {
		if (!isCallOrNewExpression(expression, {
			names: builtinErrors,
			optional: false,
		})) {
			return;
		}

		const scope = context.sourceCode.getScope(expression);
		if (isShadowed(scope, expression.callee)) {
			return;
		}

		const constructorName = expression.callee.name;
		const messageArgumentIndex = constructorName === 'AggregateError' ? 1 : 0;
		const callArguments = expression.arguments;

		// If message is `SpreadElement` or there is `SpreadElement` before message
		if (callArguments.some((node, index) => index <= messageArgumentIndex && node.type === 'SpreadElement')) {
			return;
		}

		const node = callArguments[messageArgumentIndex];
		if (!node) {
			return {
				node: expression,
				messageId: MESSAGE_ID_MISSING_MESSAGE,
				data: {constructorName},
			};
		}

		// These types can't be string, and `getStaticValue` may don't know the value
		// Add more types, if issue reported
		if (node.type === 'ArrayExpression' || node.type === 'ObjectExpression') {
			return {
				node,
				messageId: MESSAGE_ID_NOT_STRING,
			};
		}

		const staticResult = getStaticValue(node, scope);

		// We don't know the value of `message`
		if (!staticResult) {
			return;
		}

		const {value} = staticResult;
		if (typeof value !== 'string') {
			return {
				node,
				messageId: MESSAGE_ID_NOT_STRING,
			};
		}

		if (value === '') {
			return {
				node,
				messageId: MESSAGE_ID_EMPTY_MESSAGE,
			};
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce passing a `message` value when creating a built-in error.',
			recommended: true,
		},
		messages,
	},
};

export default config;
