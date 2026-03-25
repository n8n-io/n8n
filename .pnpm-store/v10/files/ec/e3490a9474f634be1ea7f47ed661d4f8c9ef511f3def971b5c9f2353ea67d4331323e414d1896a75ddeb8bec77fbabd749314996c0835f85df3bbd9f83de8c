import {isOpeningBraceToken} from '@eslint-community/eslint-utils';

const MESSAGE_ID = 'empty-brace-spaces';
const messages = {
	[MESSAGE_ID]: 'Do not add spaces between braces.',
};

const getProblem = (node, context) => {
	const {sourceCode} = context;
	const openingBrace = sourceCode.getFirstToken(node, {filter: isOpeningBraceToken});
	const closingBrace = sourceCode.getLastToken(node);
	const [, start] = sourceCode.getRange(openingBrace);
	const [end] = sourceCode.getRange(closingBrace);
	const textBetween = sourceCode.text.slice(start, end);

	if (!/^\s+$/.test(textBetween)) {
		return;
	}

	return {
		loc: {
			start: sourceCode.getLoc(openingBrace).end,
			end: sourceCode.getLoc(closingBrace).start,
		},
		messageId: MESSAGE_ID,
		fix: fixer => fixer.removeRange([start, end]),
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on([
		'BlockStatement',
		'ClassBody',
		'StaticBlock',
		'ObjectExpression',
	], node => {
		const children = node.type === 'ObjectExpression' ? node.properties : node.body;

		if (children.length > 0) {
			return;
		}

		return getProblem(node, context);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Enforce no spaces between braces.',
			recommended: true,
		},
		fixable: 'whitespace',
		messages,
	},
};

export default config;
