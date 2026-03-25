import {isParenthesized} from '@eslint-community/eslint-utils';

const MESSAGE_ID_TOO_DEEP = 'too-deep';
const MESSAGE_ID_SHOULD_PARENTHESIZED = 'should-parenthesized';
const messages = {
	[MESSAGE_ID_TOO_DEEP]: 'Do not nest ternary expressions.',
	[MESSAGE_ID_SHOULD_PARENTHESIZED]: 'Nest ternary expression should be parenthesized.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	ConditionalExpression(node) {
		if ([
			node.test,
			node.consequent,
			node.alternate,
		].some(node => node.type === 'ConditionalExpression')) {
			return;
		}

		const {sourceCode} = context;
		const ancestors = sourceCode.getAncestors(node).reverse();
		const nestLevel = ancestors.findIndex(node => node.type !== 'ConditionalExpression');

		if (nestLevel === 1 && !isParenthesized(node, sourceCode)) {
			return {
				node,
				messageId: MESSAGE_ID_SHOULD_PARENTHESIZED,
				fix: fixer => [
					fixer.insertTextBefore(node, '('),
					fixer.insertTextAfter(node, ')'),
				],
			};
		}

		// Nesting more than one level not allowed
		if (nestLevel > 1) {
			return {
				node: nestLevel > 2 ? ancestors[nestLevel - 3] : node,
				messageId: MESSAGE_ID_TOO_DEEP,
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
			description: 'Disallow nested ternary expressions.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
