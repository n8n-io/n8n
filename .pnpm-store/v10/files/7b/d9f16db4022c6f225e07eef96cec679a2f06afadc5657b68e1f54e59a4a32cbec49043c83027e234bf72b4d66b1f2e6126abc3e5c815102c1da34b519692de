import {replaceTemplateElement} from './fix/index.js';
import {isRegexLiteral, isStringLiteral, isTaggedTemplateLiteral} from './ast/index.js';

const MESSAGE_ID_UPPERCASE = 'escape-uppercase';
const MESSAGE_ID_LOWERCASE = 'escape-lowercase';
const messages = {
	[MESSAGE_ID_UPPERCASE]: 'Use uppercase characters for the value of the escape sequence.',
	[MESSAGE_ID_LOWERCASE]: 'Use lowercase characters for the value of the escape sequence.',
};

const escapeCase = /(?<=(?:^|[^\\])(?:\\\\)*\\)(?<data>x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|u{[\dA-Fa-f]+})/g;
const escapePatternCase = /(?<=(?:^|[^\\])(?:\\\\)*\\)(?<data>x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|u{[\dA-Fa-f]+}|c[A-Za-z])/g;
const getProblem = ({node, original, regex = escapeCase, lowercase, fix}) => {
	const fixed = original.replace(regex, data => data[0] + data.slice(1)[lowercase ? 'toLowerCase' : 'toUpperCase']());

	if (fixed !== original) {
		return {
			node,
			messageId: lowercase ? MESSAGE_ID_LOWERCASE : MESSAGE_ID_UPPERCASE,
			fix: fixer => fix ? fix(fixer, fixed) : fixer.replaceText(node, fixed),
		};
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const lowercase = context.options[0] === 'lowercase';

	context.on('Literal', node => {
		if (isStringLiteral(node)) {
			return getProblem({
				node,
				original: node.raw,
				lowercase,
			});
		}
	});

	context.on('Literal', node => {
		if (isRegexLiteral(node)) {
			return getProblem({
				node,
				original: node.raw,
				regex: escapePatternCase,
				lowercase,
			});
		}
	});

	context.on('TemplateElement', node => {
		if (isTaggedTemplateLiteral(node.parent, ['String.raw'])) {
			return;
		}

		return getProblem({
			node,
			original: node.value.raw,
			lowercase,
			fix: (fixer, fixed) => replaceTemplateElement(fixer, node, fixed),
		});
	});
};

const schema = [
	{
		enum: ['uppercase', 'lowercase'],
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require escape sequences to use uppercase or lowercase values.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: ['uppercase'],
		messages,
	},
};

export default config;
