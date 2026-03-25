import {replaceStringRaw} from './fix/index.js';

const MESSAGE_ID_ERROR = 'text-encoding-identifier/error';
const MESSAGE_ID_SUGGESTION = 'text-encoding-identifier/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};

const getReplacement = encoding => {
	switch (encoding.toLowerCase()) {
		// eslint-disable-next-line unicorn/text-encoding-identifier-case
		case 'utf-8':
		case 'utf8': {
			return 'utf8';
		}

		case 'ascii': {
			return 'ascii';
		}
		// No default
	}
};

// `fs.{readFile,readFileSync}()`
const isFsReadFileEncoding = node =>
	node.parent.type === 'CallExpression'
	&& !node.parent.optional
	&& node.parent.arguments[1] === node
	&& node.parent.arguments[0].type !== 'SpreadElement'
	&& node.parent.callee.type === 'MemberExpression'
	&& !node.parent.callee.optional
	&& !node.parent.callee.computed
	&& node.parent.callee.property.type === 'Identifier'
	&& (node.parent.callee.property.name === 'readFile' || node.parent.callee.property.name === 'readFileSync');

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	Literal(node) {
		if (typeof node.value !== 'string') {
			return;
		}

		if (
			// eslint-disable-next-line unicorn/text-encoding-identifier-case
			node.value === 'utf-8'
			&& node.parent.type === 'JSXAttribute'
			&& node.parent.value === node
			&& node.parent.name.type === 'JSXIdentifier'
			&& node.parent.name.name.toLowerCase() === 'charset'
			&& node.parent.parent.type === 'JSXOpeningElement'
			&& node.parent.parent.attributes.includes(node.parent)
			&& node.parent.parent.name.type === 'JSXIdentifier'
			&& node.parent.parent.name.name.toLowerCase() === 'meta'
		) {
			return;
		}

		const {raw} = node;
		const value = raw.slice(1, -1);

		const replacement = getReplacement(value);
		if (!replacement || replacement === value) {
			return;
		}

		/** @param {import('eslint').Rule.RuleFixer} fixer */
		const fix = fixer => replaceStringRaw(fixer, node, replacement);

		const problem = {
			node,
			messageId: MESSAGE_ID_ERROR,
			data: {
				value,
				replacement,
			},
		};

		if (isFsReadFileEncoding(node)) {
			problem.fix = fix;
			return problem;
		}

		problem.suggest = [
			{
				messageId: MESSAGE_ID_SUGGESTION,
				fix: fixer => replaceStringRaw(fixer, node, replacement),
			},
		];

		return problem;
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent case for text encoding identifiers.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
