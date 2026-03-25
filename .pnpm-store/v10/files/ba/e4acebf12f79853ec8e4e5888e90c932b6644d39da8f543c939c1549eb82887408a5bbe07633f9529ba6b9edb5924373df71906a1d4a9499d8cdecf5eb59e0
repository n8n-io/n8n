import {isParenthesized, getParenthesizedRange, toLocation} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-unreadable-iife';
const messages = {
	[MESSAGE_ID_ERROR]: 'IIFE with parenthesized arrow function body is considered unreadable.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(callExpression) {
		const {sourceCode} = context;

		if (
			callExpression.callee.type !== 'ArrowFunctionExpression'
			|| callExpression.callee.body.type === 'BlockStatement'
			|| !isParenthesized(callExpression.callee.body, sourceCode)
		) {
			return;
		}

		return {
			node: callExpression,
			loc: toLocation(getParenthesizedRange(callExpression.callee.body, sourceCode), sourceCode),
			messageId: MESSAGE_ID_ERROR,
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unreadable IIFEs.',
			recommended: true,
		},
		hasSuggestions: false,
		messages,
	},
};

export default config;
