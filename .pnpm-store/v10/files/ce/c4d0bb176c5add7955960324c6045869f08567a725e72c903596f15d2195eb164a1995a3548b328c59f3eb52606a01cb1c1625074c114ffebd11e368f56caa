import {switchCallExpressionToNewExpression} from './fix/index.js';

const messageId = 'throw-new-error';
const messages = {
	[messageId]: 'Use `new` when creating an error.',
};

const customError = /^(?:[A-Z][\da-z]*)*Error$/;

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(node) {
		const {callee} = node;
		if (!(
			(callee.type === 'Identifier' && customError.test(callee.name))
			|| (
				callee.type === 'MemberExpression'
				&& !callee.computed
				&& callee.property.type === 'Identifier'
				&& customError.test(callee.property.name)
			)
		)) {
			return;
		}

		return {
			node,
			messageId,
			fix: fixer => switchCallExpressionToNewExpression(node, context.sourceCode, fixer),
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require `new` when creating an error.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
