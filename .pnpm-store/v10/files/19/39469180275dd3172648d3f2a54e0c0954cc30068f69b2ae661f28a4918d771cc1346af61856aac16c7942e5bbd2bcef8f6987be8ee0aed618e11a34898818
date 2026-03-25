import {isColonToken} from '@eslint-community/eslint-utils';
import getSwitchCaseHeadLocation from './utils/get-switch-case-head-location.js';
import getIndentString from './utils/get-indent-string.js';
import {replaceNodeOrTokenAndSpacesBefore} from './fix/index.js';

const MESSAGE_ID_EMPTY_CLAUSE = 'switch-case-braces/empty';
const MESSAGE_ID_MISSING_BRACES = 'switch-case-braces/missing';
const MESSAGE_ID_UNNECESSARY_BRACES = 'switch-case-braces/unnecessary';
const messages = {
	[MESSAGE_ID_EMPTY_CLAUSE]: 'Unexpected braces in empty case clause.',
	[MESSAGE_ID_MISSING_BRACES]: 'Missing braces in case clause.',
	[MESSAGE_ID_UNNECESSARY_BRACES]: 'Unnecessary braces in case clause.',
};

function * removeBraces(fixer, node, sourceCode) {
	const [blockStatement] = node.consequent;
	const openingBraceToken = sourceCode.getFirstToken(blockStatement);
	yield * replaceNodeOrTokenAndSpacesBefore(openingBraceToken, '', fixer, sourceCode);

	const closingBraceToken = sourceCode.getLastToken(blockStatement);
	yield fixer.remove(closingBraceToken);
}

function * addBraces(fixer, node, sourceCode) {
	const colonToken = sourceCode.getTokenAfter(
		node.test || sourceCode.getFirstToken(node),
		isColonToken,
	);
	yield fixer.insertTextAfter(colonToken, ' {');

	const lastToken = sourceCode.getLastToken(node);
	const indent = getIndentString(node, sourceCode);
	yield fixer.insertTextAfter(lastToken, `\n${indent}}`);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const isBracesRequired = context.options[0] !== 'avoid';
	const {sourceCode} = context;

	return {
		SwitchCase(node) {
			const {consequent} = node;
			if (consequent.length === 0) {
				return;
			}

			if (
				consequent.length === 1
				&& consequent[0].type === 'BlockStatement'
				&& consequent[0].body.length === 0
			) {
				return {
					node,
					loc: sourceCode.getLoc(sourceCode.getFirstToken(consequent[0])),
					messageId: MESSAGE_ID_EMPTY_CLAUSE,
					fix: fixer => removeBraces(fixer, node, sourceCode),
				};
			}

			if (
				isBracesRequired
				&& !(
					consequent.length === 1
					&& consequent[0].type === 'BlockStatement'
				)
			) {
				return {
					node,
					loc: getSwitchCaseHeadLocation(node, sourceCode),
					messageId: MESSAGE_ID_MISSING_BRACES,
					fix: fixer => addBraces(fixer, node, sourceCode),
				};
			}

			if (
				!isBracesRequired
				&& consequent.length === 1
				&& consequent[0].type === 'BlockStatement'
				&& consequent[0].body.every(node =>
					node.type !== 'VariableDeclaration'
					&& node.type !== 'FunctionDeclaration',
				)
			) {
				return {
					node,
					loc: sourceCode.getLoc(sourceCode.getFirstToken(consequent[0])),
					messageId: MESSAGE_ID_UNNECESSARY_BRACES,
					fix: fixer => removeBraces(fixer, node, sourceCode),
				};
			}
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Enforce consistent brace style for `case` clauses.',
			recommended: true,
		},
		fixable: 'code',
		schema: [{enum: ['always', 'avoid']}],
		defaultOptions: ['always'],
		messages,
	},
};

export default config;
