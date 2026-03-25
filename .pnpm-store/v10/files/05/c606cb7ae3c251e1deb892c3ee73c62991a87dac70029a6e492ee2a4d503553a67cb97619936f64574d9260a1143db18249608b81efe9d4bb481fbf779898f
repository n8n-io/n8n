import {appendArgument} from './fix/index.js';
import {isMethodCall} from './ast/index.js';
import {isArrayPrototypeProperty} from './utils/index.js';

const MESSAGE_ID = 'require-array-join-separator';
const messages = {
	[MESSAGE_ID]: 'Missing the separator argument.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(node) {
		if (!(
			// `foo.join()`
			isMethodCall(node, {
				method: 'join',
				argumentsLength: 0,
				optionalCall: false,
			})
			// `[].join.call(foo)` and `Array.prototype.join.call(foo)`
			|| (
				isMethodCall(node, {
					method: 'call',
					argumentsLength: 1,
					optionalCall: false,
					optionalMember: false,
				})
				&& isArrayPrototypeProperty(node.callee.object, {
					property: 'join',
				})
			)
		)) {
			return;
		}

		const {sourceCode} = context;
		const [penultimateToken, lastToken] = sourceCode.getLastTokens(node, 2);
		const isPrototypeMethod = node.arguments.length === 1;
		return {
			loc: {
				start: sourceCode.getLoc(penultimateToken)[isPrototypeMethod ? 'end' : 'start'],
				end: sourceCode.getLoc(lastToken).end,
			},
			messageId: MESSAGE_ID,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix: fixer => appendArgument(fixer, node, '\',\'', sourceCode),
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce using the separator argument with `Array#join()`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
