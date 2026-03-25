import {isMethodCall, isLiteral} from './ast/index.js';
import {removeArgument} from './fix/index.js';
import {} from './utils/index.js';

const MESSAGE_ID = 'no-unnecessary-array-flat-depth';
const messages = {
	[MESSAGE_ID]: 'Passing `1` as the `depth` argument is unnecessary.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!(
			isMethodCall(callExpression, {
				method: 'flat',
				argumentsLength: 1,
				optionalCall: false,
			})
			&& isLiteral(callExpression.arguments[0], 1)
		)) {
			return;
		}

		const [numberOne] = callExpression.arguments;

		return {
			node: numberOne,
			messageId: MESSAGE_ID,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix: fixer => removeArgument(fixer, numberOne, context.sourceCode),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow using `1` as the `depth` argument of `Array#flat()`.',
			recommended: true,
		},
		fixable: 'code',

		messages,
	},
};

export default config;
