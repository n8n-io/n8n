import {checkVueTemplate} from './utils/rule.js';
import {isNumberLiteral, isBigIntLiteral} from './ast/index.js';

const MESSAGE_ID = 'number-literal-case';
const messages = {
	[MESSAGE_ID]: 'Invalid number literal casing.',
};

/**
@param {string} raw
@param {Options} options
*/
const fix = (raw, {hexadecimalValue}) => {
	let fixed = raw.toLowerCase();
	if (fixed.startsWith('0x')) {
		fixed = '0x' + fixed.slice(2)[hexadecimalValue === 'lowercase' ? 'toLowerCase' : 'toUpperCase']();
	}

	return fixed;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	Literal(node) {
		const {raw} = node;

		/** @type {Options} */
		const options = context.options[0] ?? {};
		options.hexadecimalValue ??= 'uppercase';

		let fixed = raw;
		if (isNumberLiteral(node)) {
			fixed = fix(raw, options);
		} else if (isBigIntLiteral(node)) {
			fixed = fix(raw.slice(0, -1), options) + 'n';
		}

		if (raw !== fixed) {
			return {
				node,
				messageId: MESSAGE_ID,
				fix: fixer => fixer.replaceText(node, fixed),
			};
		}
	},
});

/** @typedef {Record<keyof typeof schema[0]["properties"], typeof caseEnum["enum"][number]>} Options */

const caseEnum = /** @type {const} */ ({
	enum: ['uppercase', 'lowercase'],
});

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			hexadecimalValue: caseEnum,
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create: checkVueTemplate(create),
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce proper case for numeric literals.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [{
			hexadecimalValue: 'uppercase',
		}],
		messages,
	},
};

export default config;
