import {appendArgument} from './fix/index.js';
import {isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'require-number-to-fixed-digits-argument';
const messages = {
	[MESSAGE_ID]: 'Missing the digits argument.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(node) {
		if (
			!isMethodCall(node, {
				method: 'toFixed',
				argumentsLength: 0,
				optionalCall: false,
				optionalMember: false,
			})
			|| node.callee.object.type === 'NewExpression'
		) {
			return;
		}

		const {sourceCode} = context;
		const [
			openingParenthesis,
			closingParenthesis,
		] = sourceCode.getLastTokens(node, 2);

		return {
			loc: {
				start: sourceCode.getLoc(openingParenthesis).start,
				end: sourceCode.getLoc(closingParenthesis).end,
			},
			messageId: MESSAGE_ID,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix: fixer => appendArgument(fixer, node, '0', sourceCode),
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce using the digits argument with `Number#toFixed()`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
